const { query } = require('../../config/db');
const axios = require('axios');
const multer = require('multer');
const path = require('path');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
    cb(null, true);
  },
});

const uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const fileUrl = `/uploads/resumes/${req.user.id}_${Date.now()}${path.extname(req.file.originalname)}`;

    let parsed;
    try {
      const { data } = await axios.post(
        `${process.env.AI_RESUME_URL}/parse`,
        { file_content: req.file.buffer.toString('base64'), file_type: req.file.mimetype },
        { timeout: 30000 }
      );
      parsed = data;
    } catch (aiErr) {
      return res.status(502).json({ error: 'Resume parsing service unavailable. Please try again.' });
    }

    await query('UPDATE resumes SET is_active = FALSE WHERE user_id = $1', [req.user.id]);

    const { rows } = await query(
      `INSERT INTO resumes (user_id, file_url, raw_text, parsed_data)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, fileUrl, parsed.raw_text, JSON.stringify(parsed.structured)]
    );

    if (parsed.structured?.skills?.length) {
      await query(
        'UPDATE user_profiles SET skills = $1 WHERE user_id = $2',
        [parsed.structured.skills, req.user.id]
      );
    }

    const row = rows[0];
    // Return parsed_data as object (not string) for frontend
    res.status(201).json({
      ...row,
      parsed_data: typeof row.parsed_data === 'string' ? JSON.parse(row.parsed_data) : row.parsed_data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
};

const analyzeResume = async (req, res) => {
  try {
    const { resume_id, job_description } = req.body;
    if (!resume_id || !job_description?.trim())
      return res.status(400).json({ error: 'resume_id and job_description are required' });

    const { rows: resumes } = await query(
      'SELECT * FROM resumes WHERE id = $1 AND user_id = $2',
      [resume_id, req.user.id]
    );
    if (!resumes[0]) return res.status(404).json({ error: 'Resume not found' });

    const parsedData = typeof resumes[0].parsed_data === 'string'
      ? JSON.parse(resumes[0].parsed_data)
      : resumes[0].parsed_data;

    let analysis;
    try {
      const { data } = await axios.post(
        `${process.env.AI_RESUME_URL}/analyze`,
        { resume_text: resumes[0].raw_text, job_description, parsed_data: parsedData },
        { timeout: 30000 }
      );
      analysis = data;
    } catch (aiErr) {
      return res.status(502).json({ error: 'Analysis service unavailable. Please try again.' });
    }

    await query(
      `INSERT INTO resume_analyses (resume_id, job_description, ats_score, keyword_matches, section_scores, improvements)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        resume_id, job_description, analysis.ats_score,
        JSON.stringify(analysis.keyword_matches),
        JSON.stringify(analysis.section_scores),
        JSON.stringify(analysis.improvements),
      ]
    );

    // Return the analysis directly (not the DB row) so frontend gets the right shape
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
};

// Handle multer errors (file type / size)
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large. Max 5MB.' });
    return res.status(400).json({ error: err.message });
  }
  if (err) return res.status(400).json({ error: err.message });
  next();
};

const getAnalyses = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT ra.*, r.file_url FROM resume_analyses ra
       JOIN resumes r ON r.id = ra.resume_id
       WHERE r.user_id = $1 ORDER BY ra.analyzed_at DESC`,
      [req.user.id]
    );
    // Parse JSONB fields
    const parsed = rows.map(r => ({
      ...r,
      keyword_matches: typeof r.keyword_matches === 'string' ? JSON.parse(r.keyword_matches) : r.keyword_matches,
      section_scores: typeof r.section_scores === 'string' ? JSON.parse(r.section_scores) : r.section_scores,
      improvements: typeof r.improvements === 'string' ? JSON.parse(r.improvements) : r.improvements,
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { upload, handleUploadError, uploadResume, analyzeResume, getAnalyses };
