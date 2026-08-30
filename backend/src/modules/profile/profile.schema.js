const Joi = require('joi');

// Profile updates are fully optional — only provided fields are applied.
const updateProfileSchema = Joi.object({
  full_name: Joi.string().min(2).max(100),
  avatar_url: Joi.string().uri().allow(''),
  target_company: Joi.string().max(100).allow(''),
  target_role: Joi.string().max(100).allow(''),
  experience_level: Joi.string().valid('fresher', '0-2', '2-5', '5+'),
  college: Joi.string().max(255).allow(''),
  graduation_year: Joi.number().integer().min(1950).max(2100),
  bio: Joi.string().max(3000).allow(''),
  linkedin_url: Joi.string().uri().allow(''),
  github_url: Joi.string().uri().allow(''),
  skills: Joi.array().items(Joi.string().max(100)).max(60),
}).min(1).messages({
  'object.min': 'At least one profile field must be provided',
});

module.exports = { updateProfileSchema };