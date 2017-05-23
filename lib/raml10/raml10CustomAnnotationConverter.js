class Raml10CustomAnnotationConverter {

  static _createAnnotation(model, prefix, id) {
    let definition;
    let found = true;
    switch (id) {
      case prefix + '-' + 'allowEmptyValue':
        definition = {
          type: 'boolean'
        };
        break;

      case prefix + '-' + 'tags':
        definition = {
          type: 'string[]',
          allowedTargets: 'Method'
        };
        break;

      case prefix + '-' + 'deprecated':
        definition = {
          type: 'boolean',
          allowedTargets: 'Method'
        };
        break;

      case prefix + '-' + 'summary':
        definition = {
          type: 'string',
          allowedTargets: 'Method'
        };
        break;

      case prefix + '-' + 'externalDocs':
        definition = {
          properties: {
            'description?': 'string',
            'url': 'string'
          },
          allowedTargets: ['API', 'Method', 'TypeDeclaration']
        };
        break;

      case prefix + '-' + 'info':
        definition = {
          properties: {
            'termsOfService?': 'string',
            'contact?': {
              properties: {
                'name?': 'string',
                'url?': 'string',
                'email?': 'string'
              }
            },
            'license?': {
              properties: {
                'name?': 'string',
                'url?': 'string'
              }
            }
          },
          allowedTargets: 'API'
        };
        break;

      case prefix + '-' + 'schema-title':
        definition = {
          type: 'string',
          allowedTargets: 'TypeDeclaration'
        };
        break;

      case prefix + '-' + 'property-title':
        definition = {
          type: 'string',
          allowedTargets: 'TypeDeclaration'
        };
        break;

      case prefix + '-' + 'body-name':
        definition = {
          type: 'string',
          allowedTargets: 'TypeDeclaration'
        };
        break;

      case prefix + '-' + 'responses-default':
        definition = {
          type: 'any',
          allowedTargets: 'Method'
        };
        break;

      case prefix + '-' + 'global-response-definition':
        definition = {
          type: 'any',
          allowedTargets: 'Response'
        };
        break;

      case prefix + '-' + 'definition-name':
        definition = {
          type: 'string',
          allowedTargets: 'TypeDeclaration'
        };
        break;

      case prefix + '-' + 'collectionFormat':
        definition = {
          type: 'string'
        };
        break;

      case prefix + '-' + 'format':
        definition = {
          type: 'string',
          allowedTargets: 'TypeDeclaration'
        };
        break;

      case prefix + '-' + 'readOnly':
        definition = {
          type: 'boolean',
          allowedTargets: 'TypeDeclaration'
        };
        break;

      case prefix + '-' + 'responses':
        definition = 'any';
        break;

      case prefix + '-' + 'exclusiveMaximum':
      case prefix + '-' + 'exclusiveMinimum':
        definition = {
          type: 'boolean'
        };
        break;

      case prefix + '-' + 'maximum':
      case prefix + '-' + 'minimum':
        definition = {
          allowedTargets: 'TypeDeclaration',
          type: 'number'
        };
        break;

      default:
        found = false;
        break;
    }

    if (!found) return false;

    if (!model.annotationTypes) {
      model.annotationTypes = {};
    }

    if (!model.annotationTypes.hasOwnProperty(id)) {
      model.annotationTypes[id] = definition;
    }

    return true;
  }
}

module.exports = Raml10CustomAnnotationConverter;