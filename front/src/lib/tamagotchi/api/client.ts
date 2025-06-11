export interface ApiGotchi {
  name: string;
  activity: string | number; // Server sends string, but we'll parse it
  health?: string | { [key: string]: number }; // Can be "Healthy" or {"Sick": 1490} or {"Dead": 1500}
  food: number;
  sweets: number;
  vitamins: number;
  pooped?: boolean; // Whether the pet has pooped
  born_at?: number; // Block number when the pet was born
}

class HyligotchiAPIClient {
  private baseUrl: string;
  private identity: string | null = null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_HYLIGOTCHI_API_URL || 'http://localhost:4008';
  }

  setIdentity(identity: string) {
    this.identity = identity;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.identity) {
      (headers as any)['x-identity'] = this.identity;
    }

    const fetchOptions = {
      ...options,
      headers,
    };
    
    console.log('Fetch URL:', `${this.baseUrl}${url}`);
    console.log('Fetch options:', fetchOptions);
    
    try {
      const response = await fetch(`${this.baseUrl}${url}`, fetchOptions);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async init(name: string, createIdentityBlobs?: () => [any, any]): Promise<ApiGotchi> {
    if (!createIdentityBlobs) {
      throw new Error('createIdentityBlobs function is required for init');
    }
    
    let blobs;
    try {
      blobs = createIdentityBlobs();
      console.log('Created blobs:', blobs);
      
      // Validate blobs structure
      if (!Array.isArray(blobs) || blobs.length !== 2) {
        throw new Error('createIdentityBlobs must return an array with exactly 2 blobs');
      }
      
      // Ensure each blob has the expected structure
      for (let i = 0; i < blobs.length; i++) {
        if (!blobs[i] || typeof blobs[i] !== 'object') {
          throw new Error(`Blob at index ${i} is invalid`);
        }
        if (!blobs[i].contract_name || !blobs[i].data) {
          throw new Error(`Blob at index ${i} is missing contract_name or data`);
        }
      }
    } catch (error) {
      console.error('Failed to create identity blobs:', error);
      throw error;
    }
    
    const body = JSON.stringify(blobs);
    console.log('Sending body:', body);
    console.log('Body length:', body.length);
    
    return this.fetchWithAuth(`/api/init?name=${encodeURIComponent(name)}`, {
      method: 'POST',
      body: body,
    });
  }

  async getState(): Promise<ApiGotchi | null> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/indexer/contract/hyligotchi/state`, {
        headers: {
          'X-identity': this.identity || '',
        },
      });

      if (!response.ok) {
        const error = new Error(`API Error: ${response.status} ${response.statusText}`) as any;
        error.response = { status: response.status };
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get state:', error);
      throw error;
    }
  }

  async feedFood(amount: number, createIdentityBlobs?: () => [any, any]): Promise<ApiGotchi> {
    if (!createIdentityBlobs) {
      throw new Error('createIdentityBlobs function is required');
    }
    
    let blobs;
    try {
      blobs = createIdentityBlobs();
    } catch (error) {
      console.error('Failed to create identity blobs:', error);
      throw new Error('Failed to create identity blobs. Please ensure you have an active session key.');
    }
    
    return this.fetchWithAuth(`/api/feed/food?amount=${amount}`, {
      method: 'POST',
      body: JSON.stringify(blobs),
    });
  }

  async feedSweets(amount: number, createIdentityBlobs?: () => [any, any]): Promise<ApiGotchi> {
    if (!createIdentityBlobs) {
      throw new Error('createIdentityBlobs function is required');
    }
    
    let blobs;
    try {
      blobs = createIdentityBlobs();
    } catch (error) {
      console.error('Failed to create identity blobs:', error);
      throw new Error('Failed to create identity blobs. Please ensure you have an active session key.');
    }
    
    return this.fetchWithAuth(`/api/feed/sweets?amount=${amount}`, {
      method: 'POST',
      body: JSON.stringify(blobs),
    });
  }

  async feedVitamins(amount: number, createIdentityBlobs?: () => [any, any]): Promise<ApiGotchi> {
    if (!createIdentityBlobs) {
      throw new Error('createIdentityBlobs function is required');
    }
    
    let blobs;
    try {
      blobs = createIdentityBlobs();
    } catch (error) {
      console.error('Failed to create identity blobs:', error);
      throw new Error('Failed to create identity blobs. Please ensure you have an active session key.');
    }
    
    return this.fetchWithAuth(`/api/feed/vitamins?amount=${amount}`, {
      method: 'POST',
      body: JSON.stringify(blobs),
    });
  }

  async resurrect(createIdentityBlobs?: () => [any, any]): Promise<ApiGotchi> {
    if (!createIdentityBlobs) {
      throw new Error('createIdentityBlobs function is required');
    }
    
    let blobs;
    try {
      blobs = createIdentityBlobs();
    } catch (error) {
      console.error('Failed to create identity blobs:', error);
      throw new Error('Failed to create identity blobs. Please ensure you have an active session key.');
    }
    
    return this.fetchWithAuth('/api/resurrect', {
      method: 'POST',
      body: JSON.stringify(blobs),
    });
  }

  async cleanPoop(createIdentityBlobs?: () => [any, any]): Promise<ApiGotchi> {
    if (!createIdentityBlobs) {
      throw new Error('createIdentityBlobs function is required');
    }
    
    let blobs;
    try {
      blobs = createIdentityBlobs();
    } catch (error) {
      console.error('Failed to create identity blobs:', error);
      throw new Error('Failed to create identity blobs. Please ensure you have an active session key.');
    }
    
    return this.fetchWithAuth('/api/poop/clean', {
      method: 'POST',
      body: JSON.stringify(blobs),
    });
  }

  async tick(createIdentityBlobs?: () => [any, any]): Promise<ApiGotchi> {
    if (!createIdentityBlobs) {
      throw new Error('createIdentityBlobs function is required');
    }
    
    let blobs;
    try {
      blobs = createIdentityBlobs();
      console.log('Created blobs for tick:', blobs);
    } catch (error) {
      console.error('Failed to create identity blobs:', error);
      throw new Error('Failed to create identity blobs. Please ensure you have an active session key.');
    }
    
    return this.fetchWithAuth('/api/tick', {
      method: 'POST',
      body: JSON.stringify(blobs),
    });
  }

  async getConfig() {
    return this.fetchWithAuth('/api/config', {
      method: 'GET',
    });
  }

  isAvailable(): boolean {
    return !!this.baseUrl;
  }
}

export const apiClient = new HyligotchiAPIClient();