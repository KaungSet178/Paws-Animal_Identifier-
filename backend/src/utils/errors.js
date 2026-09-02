class ApiError extends Error {
  constructor(code, message, status = 500, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function validationError(code, message, details) {
  return new ApiError(code, message, 400, details);
}

module.exports = {
  ApiError,
  validationError
};
