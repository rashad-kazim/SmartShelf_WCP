type ApiErrorShape = {
  data?: {
    error?: {
      code?: string;
      message?: string;
    };
    message?: string;
  };
  error?: string;
};

type Translator = (key: string, defaultValue?: string) => string;

const getKnownErrorMessage = (code: string | undefined, message: string | undefined, t: Translator) => {
  switch (code) {
    case 'email_not_registered':
      return t('email_not_registered');
    case 'password_incorrect':
      return t('password_incorrect');
    case 'wcp_access_denied':
      return t('wcp_access_denied');
    case 'invalid_credentials':
      return t('invalid_credentials');
    case 'too_many_login_attempts':
      return t('too_many_login_attempts');
    case 'invalid_session':
      return t('invalid_session');
    case 'store_not_found':
      return t('store_not_found');
    case 'user_not_found':
      return t('user_not_found');
  }

  switch (message) {
    case 'name is required':
      return t('name') + '*';
    case 'surname is required':
      return t('surname') + '*';
    case 'role is required':
      return t('role') + '*';
    case 'country is required':
      return t('country') + '*';
    case 'city is required':
      return t('city') + '*';
    case 'workplace is required':
      return t('workplace') + '*';
    case 'store name is required':
      return t('store_name') + '*';
    case 'branch name is required':
      return t('branch_name') + '*';
    case 'address is required':
      return t('store_address') + '*';
    case 'owner name is required':
      return t('owner_name') + '*';
    case 'owner surname is required':
      return t('owner_surname') + '*';
    case 'at least one device is required':
      return t('at_least_one_device_required');
    case 'device location is required':
      return t('device_location_required');
    case 'screen size is required':
      return t('screen_size') + '*';
    case 'gateway port is required':
      return t('gateway_port') + '*';
    case 'wifi ssid is required':
      return t('wifi_ssid') + '*';
    case 'wifi password is required':
      return t('wifi_password') + '*';
    case 'Store was not found.':
      return t('store_not_found');
    case 'User was not found.':
      return t('user_not_found');
    case 'Session is invalid.':
      return t('invalid_session');
  }

  return null;
};

export const getApiErrorMessage = (error: unknown, fallback: string, t?: Translator) => {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'object' && error) {
    const apiError = error as ApiErrorShape;
    const resolvedError = t ? getKnownErrorMessage(apiError.data?.error?.code, apiError.data?.error?.message, t) : null;
    if (resolvedError) {
      return resolvedError;
    }
    if (apiError.data?.error?.message) {
      return apiError.data.error.message;
    }
    if (apiError.data?.message) {
      return apiError.data.message;
    }
    if (apiError.error) {
      return apiError.error;
    }
  }

  return fallback;
};
