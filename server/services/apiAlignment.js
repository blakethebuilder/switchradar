class APIAlignmentService {
  constructor(app) {
    this.app = app;
    this.endpointMappings = [
      {
        frontendPath: '/api/businesses/sync',
        backendPath: '/api/businesses/sync',
        method: 'POST',
        dataStructure: 'BusinessSyncRequest'
      },
      {
        frontendPath: '/api/datasets',
        backendPath: '/api/datasets',
        method: 'GET',
        dataStructure: 'DatasetList'
      },
      {
        frontendPath: '/api/datasets',
        backendPath: '/api/datasets',
        method: 'POST',
        dataStructure: 'DatasetCreateRequest'
      },
      // Existing endpoints that should remain
      {
        frontendPath: '/api/leads/sync',
        backendPath: '/api/leads/sync',
        method: 'POST',
        dataStructure: 'LeadSyncRequest'
      }
    ];
  }

  async validateEndpoints() {
    const results = [];
    
    for (const mapping of this.endpointMappings) {
      const isAvailable = await this.checkEndpointAvailability(mapping.backendPath, mapping.method);
      results.push({
        ...mapping,
        isAvailable,
        timestamp: new Date()
      });
    }
    
    const allValid = results.every(r => r.isAvailable);
    
    return {
      isValid: allValid,
      results,
      timestamp: new Date()
    };
  }

  async checkEndpointAvailability(endpoint, method) {
    try {
      // Check if route is registered in Express app
      const routes = this.getRegisteredRoutes();
      const routeKey = `${method.toUpperCase()} ${endpoint}`;
      return routes.includes(routeKey);
    } catch (error) {
      console.error(`Error checking endpoint ${endpoint}:`, error.message);
      return false;
    }
  }

  getRegisteredRoutes() {
    const routes = [];
    
    // Extract routes from Express app
    if (this.app._router && this.app._router.stack) {
      this.app._router.stack.forEach(layer => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods);
          methods.forEach(method => {
            routes.push(`${method.toUpperCase()} ${layer.route.path}`);
          });
        }
      });
    }
    
    return routes;
  }

  getEndpointMapping() {
    return [...this.endpointMappings];
  }

  async alignEndpoints(customMappings = []) {
    // Merge custom mappings with default ones
    this.endpointMappings = [...this.endpointMappings, ...customMappings];
    
    // Validate all mappings
    const validation = await this.validateEndpoints();
    
    if (!validation.isValid) {
      const missingEndpoints = validation.results
        .filter(r => !r.isAvailable)
        .map(r => `${r.method} ${r.backendPath}`);
      
      console.warn('Missing API endpoints:', missingEndpoints);
    }
    
    return validation;
  }

  logEndpointStatus() {
    console.log('=== API Endpoint Status ===');
    this.validateEndpoints().then(validation => {
      validation.results.forEach(result => {
        const status = result.isAvailable ? '✓' : '✗';
        console.log(`${status} ${result.method} ${result.backendPath}`);
      });
      console.log(`Overall status: ${validation.isValid ? 'VALID' : 'INVALID'}`);
    });
  }
}

module.exports = APIAlignmentService;