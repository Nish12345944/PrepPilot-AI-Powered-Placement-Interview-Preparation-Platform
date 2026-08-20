const { query } = require('../../config/db');
const { validationResult } = require('express-validator');

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.email, u.full_name, u.avatar_url, u.role, u.is_verified,
              u.target_company, u.target_role, u.experience_level,
              u.college, u.graduation_year, u.created_at,
              p.bio, p.linkedin_url, p.github_url, p.skills,
              p.weak_topics, p.strong_topics, p.current_streak,
              p.longest_streak, p.total_xp, p.level, p.last_active
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const {
      full_name, avatar_url, target_company, target_role,
      experience_level, college, graduation_year,
      bio, linkedin_url, github_url, skills,
    } = req.body;

    // Update users table
    const userUpdates = [];
    const userParams = [req.user.id];
    let paramIdx = 2;

    if (full_name !== undefined) { userUpdates.push(`full_name = $${paramIdx++}`); userParams.push(full_name); }
    if (avatar_url !== undefined) { userUpdates.push(`avatar_url = $${paramIdx++}`); userParams.push(avatar_url); }
    if (target_company !== undefined) { userUpdates.push(`target_company = $${paramIdx++}`); userParams.push(target_company); }
    if (target_role !== undefined) { userUpdates.push(`target_role = $${paramIdx++}`); userParams.push(target_role); }
    if (experience_level !== undefined) { userUpdates.push(`experience_level = $${paramIdx++}`); userParams.push(experience_level); }
    if (college !== undefined) { userUpdates.push(`college = $${paramIdx++}`); userParams.push(college); }
    if (graduation_year !== undefined) { userUpdates.push(`graduation_year = $${paramIdx++}`); userParams.push(graduation_year); }

    if (userUpdates.length) {
      userParams.push(req.user.id);
      await query(
        `UPDATE users SET ${userUpdates.join(', ')} WHERE id = $${paramIdx} RETURNING id`,
        userParams
      );
    }

    // Update user_profiles table (upsert)
    const profileUpdates = [];
    const profileParams = [req.user.id];
    let pIdx = 2;

    if (bio !== undefined) { profileUpdates.push(`bio = $${pIdx++}`); profileParams.push(bio); }
    if (linkedin_url !== undefined) { profileUpdates.push(`linkedin_url = $${pIdx++}`); profileParams.push(linkedin_url); }
    if (github_url !== undefined) { profileUpdates.push(`github_url = $${pIdx++}`); profileParams.push(github_url); }
    if (skills !== undefined) { profileUpdates.push(`skills = $${pIdx++}`); profileParams.push(skills); }

    if (profileUpdates.length) {
      const colNames = profileUpdates.map((u) => u.split(' = ')[0]);
      const placeholders = profileUpdates.map((_, i) => `$${i + 2}`);
      profileParams.push(req.user.id);
      await query(
        `INSERT INTO user_profiles (user_id, ${colNames.join(', ')})
         VALUES ($1, ${placeholders.join(', ')})
         ON CONFLICT (user_id) DO UPDATE SET ${profileUpdates.join(', ')}`,
        profileParams
      );
    }

    // Return updated profile
    const { rows } = await query(
      `SELECT u.id, u.email, u.full_name, u.avatar_url, u.role, u.is_verified,
              u.target_company, u.target_role, u.experience_level,
              u.college, u.graduation_year, u.created_at,
              p.bio, p.linkedin_url, p.github_url, p.skills,
              p.weak_topics, p.strong_topics, p.current_streak,
              p.longest_streak, p.total_xp, p.level, p.last_active
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getProfile, updateProfile };