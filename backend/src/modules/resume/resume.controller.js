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
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // In production: upload to S3, get URL
  const fileUrl = `/uploads/resumes/${req.user.id}_${Date.now()}${path.extname(req.file.originalname)}`;

  // Parse resume text via AI service
  const { data: parsed } = await axios.post(
    `${process.env.AI_RESUME_URL}/parse`,
    { file_content: req.file.buffer.toString('base64'), file_type: req.file.mimetype },
    { timeout: 30000 }
  );

  // Deactivate old resumes
  await query('UPDATE resumes SET is_active = FALSE WHERE user_id = $1', [req.user.id]);

  const { rows } = await query(
    `INSERT INTO resumes (user_id, file_url, raw_text, parsed_data)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.user.id, fileUrl, parsed.raw_text, JSON.stringify(parsed.structured)]
  );

  // Auto-update user skills from resume
  if (parsed.structured?.skills?.length) {
    await query(
      'UPDATE user_profiles SET skills = $1 WHERE user_id = $2',
      [parsed.structured.skills, req.user.id]
    );
  }

  res.status(201).json(rows[0]);
};

const analyzeResume = async (req, res) => {
  const { resume_id, job_description } = req.body;

  const { rows: resumes } = await query(
    'SELECT * FROM resumes WHERE id = $1 AND user_id = $2',
    [resume_id, req.user.id]
  );

  if (!resumes[0]) return res.status(404).json({ error: 'Resume not found' });

  const { data: analysis } = await axios.post(
    `${process.env.AI_RESUME_URL}/analyze`,
    { resume_text: resumes[0].raw_text, job_description, parsed_data: resumes[0].parsed_data }
  );

  const { rows } = await query(
    `INSERT INTO resume_analyses (resume_id, job_description, ats_score, keyword_matches, section_scores, improvements)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      resume_id, job_description, analysis.ats_score,
      JSON.stringify(analysis.keyword_matches),
      JSON.stringify(analysis.section_scores),
      JSON.stringify(analysis.improvements)
    ]
  );

  res.json(rows[0]);
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
  const { rows } = await query(
    `SELECT ra.*, r.file_url FROM resume_analyses ra
     JOIN resumes r ON r.id = ra.resume_id
     WHERE r.user_id = $1 ORDER BY ra.analyzed_at DESC`,
    [req.user.id]
  );
  res.json(rows);
};

module.exports = { upload, handleUploadError, uploadResume, analyzeResume, getAnalyses };
