interface ValidationResult {
    isValid: boolean;
    errors: {
        [key: string]: string;
    };
}
  
  interface RegistrationData {
    email: string;
    password: string;
    username: string;
    auth0Id?: string;
  }
  
  interface LoginData {
    email: string;
    password: string;
  }
  
  export class ValidationUtils {
    private static EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    private static USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;
    private static PASSWORD_MIN_LENGTH = 8;
    private static USERNAME_MIN_LENGTH = 3;
    private static USERNAME_MAX_LENGTH = 30;
  
    /**
     * Validates registration data
     * @param data Registration data to validate
     * @returns ValidationResult object with validation status and any errors
     */
    static validateRegistration(data: RegistrationData): ValidationResult {
      const errors: { [key: string]: string } = {};
  
      // Email validation
      if (!data.email) {
        errors.email = 'Email is required';
      } else if (!this.EMAIL_REGEX.test(data.email)) {
        errors.email = 'Please enter a valid email address';
      }
  
      // Password validation
      if (!data.password) {
        errors.password = 'Password is required';
      } else {
        if (data.password.length < this.PASSWORD_MIN_LENGTH) {
          errors.password = `Password must be at least ${this.PASSWORD_MIN_LENGTH} characters long`;
        }
        if (!/[A-Z]/.test(data.password)) {
          errors.password = 'Password must contain at least one uppercase letter';
        }
        if (!/[a-z]/.test(data.password)) {
          errors.password = 'Password must contain at least one lowercase letter';
        }
        if (!/[0-9]/.test(data.password)) {
          errors.password = 'Password must contain at least one number';
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(data.password)) {
          errors.password = 'Password must contain at least one special character';
        }
      }
  
      // Username validation
      if (!data.username) {
        errors.username = 'Username is required';
      } else {
        if (data.username.length < this.USERNAME_MIN_LENGTH) {
          errors.username = `Username must be at least ${this.USERNAME_MIN_LENGTH} characters long`;
        }
        if (data.username.length > this.USERNAME_MAX_LENGTH) {
          errors.username = `Username cannot exceed ${this.USERNAME_MAX_LENGTH} characters`;
        }
        if (!this.USERNAME_REGEX.test(data.username)) {
          errors.username = 'Username can only contain letters, numbers, underscores and dashes';
        }
      }
  
      // auth0Id validation (if provided)
      if (data.auth0Id !== undefined && !data.auth0Id) {
        errors.auth0Id = 'Auth0 ID cannot be empty if provided';
      }
  
      return {
        isValid: Object.keys(errors).length === 0,
        errors
      };
    }
  
    /**
     * Validates login data
     * @param data Login data to validate
     * @returns ValidationResult object with validation status and any errors
     */
    static validateLogin(data: LoginData): ValidationResult {
      const errors: { [key: string]: string } = {};
  
      // Email validation
      if (!data.email) {
        errors.email = 'Email is required';
      } else if (!this.EMAIL_REGEX.test(data.email)) {
        errors.email = 'Please enter a valid email address';
      }
  
      // Basic password validation for login
      if (!data.password) {
        errors.password = 'Password is required';
      } else if (data.password.length < this.PASSWORD_MIN_LENGTH) {
        errors.password = `Password must be at least ${this.PASSWORD_MIN_LENGTH} characters long`;
      }
  
      return {
        isValid: Object.keys(errors).length === 0,
        errors
      };
    }
  
    /**
     * Sanitizes user input by removing potential harmful characters
     * @param input String to sanitize
     * @returns Sanitized string
     */
    static sanitizeInput(input: string): string {
      // Remove any HTML tags
      let sanitized = input.replace(/<[^>]*>/g, '');
      
      // Remove any null bytes
      sanitized = sanitized.replace(/\0/g, '');
      
      // Trim whitespace
      sanitized = sanitized.trim();
      
      return sanitized;
    }
  }
  