const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VetPro API',
      version: '1.0.0',
      description: 'API do Sistema de Prontuários Veterinários VetPro',
      contact: {
        name: 'VetPro Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Servidor de desenvolvimento',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Patient: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            specie: { type: 'string' },
            breed: { type: 'string' },
            sex: { type: 'string' },
            age: { type: 'integer' },
            weight: { type: 'number' },
            ownerName: { type: 'string' },
            ownerPhone: { type: 'string' },
            ownerEmail: { type: 'string', format: 'email' },
          },
        },
        Consultation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            patientId: { type: 'string', format: 'uuid' },
            chiefComplaint: { type: 'string' },
            anamnesis: { type: 'string' },
            physicalExam: { type: 'string' },
            diagnosis: { type: 'string' },
            treatment: { type: 'string' },
            weight: { type: 'number' },
            temperature: { type: 'number' },
            heartRate: { type: 'integer' },
            respiratoryRate: { type: 'integer' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            crmv: { type: 'string' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    paths: {
      '/api/auth/login': {
        post: {
          summary: 'Login de usuário',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LoginRequest',
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Login bem-sucedido',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' },
                      user: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
            401: {
              description: 'Credenciais inválidas',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/patients': {
        get: {
          summary: 'Listar pacientes',
          tags: ['Patients'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Lista de pacientes',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Patient' },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: 'Criar paciente',
          tags: ['Patients'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Patient' },
              },
            },
          },
          responses: {
            201: {
              description: 'Paciente criado',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Patient' },
                },
              },
            },
          },
        },
      },
      '/api/patients/{id}': {
        get: {
          summary: 'Buscar paciente por ID',
          tags: ['Patients'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'Paciente encontrado',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Patient' },
                },
              },
            },
            404: {
              description: 'Paciente não encontrado',
            },
          },
        },
        put: {
          summary: 'Atualizar paciente',
          tags: ['Patients'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'Paciente atualizado',
            },
          },
        },
        delete: {
          summary: 'Excluir paciente',
          tags: ['Patients'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            204: {
              description: 'Paciente excluído',
            },
          },
        },
      },
      '/api/consultations': {
        get: {
          summary: 'Listar consultas',
          tags: ['Consultations'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Lista de consultas',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Consultation' },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: 'Criar consulta',
          tags: ['Consultations'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Consultation' },
              },
            },
          },
          responses: {
            201: {
              description: 'Consulta criada',
            },
          },
        },
      },
      '/health': {
        get: {
          summary: 'Health check',
          tags: ['System'],
          responses: {
            200: {
              description: 'Sistema healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ok: { type: 'boolean' },
                      timestamp: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec };
