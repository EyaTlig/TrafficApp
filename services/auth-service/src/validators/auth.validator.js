function validateRegisterInput(input) {
  if (!input.email || !input.email.includes('@')) {
    throw new Error('A valid email is required');
  }
  if (!input.username || input.username.trim().length < 3) {
    throw new Error('A username with at least 3 characters is required');
  }
  if (!input.password || input.password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }
}

function validateLoginInput(input) {
  if (!input.email || !input.email.includes('@')) {
    throw new Error('A valid email is required');
  }
  if (!input.password) {
    throw new Error('Password is required');
  }
}

module.exports = { validateRegisterInput, validateLoginInput };