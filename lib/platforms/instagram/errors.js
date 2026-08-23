export class InstagramValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "InstagramValidationError";
  }
}

export class InstagramSecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = "InstagramSecurityError";
  }
}

export class InstagramAccessibilityError extends Error {
  constructor(message) {
    super(message);
    this.name = "InstagramAccessibilityError";
  }
}
