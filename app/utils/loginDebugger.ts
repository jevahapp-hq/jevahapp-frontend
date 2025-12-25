import authService from '../services/authService';

export const loginDebugger = {
  /**
   * Test login with detailed debugging
   */
  async debugLogin(email: string, password: string, rememberMe: boolean = false) {
    // console.log('🔍 === LOGIN DEBUG START ===');
    // console.log('📧 Email:', email);
    // console.log('🔑 Password length:', password.length);
    // console.log('🔑 Password (first 3 chars):', password.substring(0, 3) + '***');
    // console.log('🧠 Remember Me:', rememberMe);
    
    try {
      // console.log('🚀 Attempting login...');
      const result = await authService.login(email, password, rememberMe);
      
      // console.log('📥 Login result:', {
      //   success: result.success,
      //   status: result.status,
      //   hasToken: !!result.data?.token,
      //   hasUser: !!result.data?.user,
      //   message: result.data?.message,
      //   error: result.data?.error
      // });
      
      if (result.success) {
        // console.log('✅ Login successful!');
        // console.log('🔑 Token received:', result.data.token ? 'Yes' : 'No');
        // console.log('👤 User data received:', result.data.user ? 'Yes' : 'No');
      } else {
        // console.log('❌ Login failed');
        // console.log('📝 Error message:', result.data?.message);
        // console.log('🔍 Full response:', result.data);
      }
      
      return result;
    } catch (error) {
      // console.error('💥 Login error:', error);
      return { success: false, error: error.message };
    } finally {
      // console.log('🔍 === LOGIN DEBUG END ===');
    }
  },

  /**
   * Test backend connectivity
   */
  async testBackendConnectivity() {
    // console.log('🔍 === BACKEND CONNECTIVITY TEST ===');
    
    try {
      const response = await fetch('https://jevahapp-backend.onrender.com/api/auth/login', {
        method: 'OPTIONS',
        headers: { 'Content-Type': 'application/json' },
      });
      
      // console.log('📡 Backend response:', {
      //   status: response.status,
      //   statusText: response.statusText,
      //   ok: response.ok
      // });
      
      return response.ok;
    } catch (error) {
      // console.error('❌ Backend connectivity test failed:', error);
      return false;
    }
  },

  /**
   * Validate email format
   */
  validateEmail(email: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    
    // console.log('📧 Email validation:', {
    //   email,
    //   isValid,
    //   length: email.length,
    //   hasAtSymbol: email.includes('@'),
    //   hasDomain: email.split('@')[1]?.includes('.')
    // });
    
    return isValid;
  },

  /**
   * Validate password strength
   */
  validatePassword(password: string) {
    const hasMinLength = password.length >= 6;
    const hasLetters = /[A-Za-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const isValid = hasMinLength && hasLetters && hasNumbers;
    
    // console.log('🔑 Password validation:', {
    //   length: password.length,
    //   hasMinLength,
    //   hasLetters,
    //   hasNumbers,
    //   isValid
    // });
    
    return isValid;
  }
};
