const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  full_name: Joi.string().min(2).max(100).required(),
  target_company: Joi.string().optional(),
  target_role: Joi.string().optional(),
  college: Joi.string().optional(),
  graduation_year: Joi.number().integer().min(2000).max(2030).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

module.exports = { registerSchema, loginSchema };
