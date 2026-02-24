const { z } = require('zod');

// ============================================
// SCHEMAS DE VALIDAÇÃO COM ZOD
// ============================================

// Schema para criação de paciente
const createPatientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  species: z.string().min(1, 'Espécie é obrigatória'),
  sex: z.enum(['M', 'F']).optional(),
  breed: z.string().optional(),
  age: z.number().int().positive().optional(),
  birthDate: z.string().optional(),
  weight: z.number().positive().optional(),
  color: z.string().optional(),
  microchip: z.string().optional(),
  porte: z.enum(['pequeno', 'grande']).optional(),
  ownerName: z.string().min(1, 'Nome do tutor é obrigatório'),
  ownerPhone: z.string().optional(),
  ownerEmail: z.string().email().optional().or(z.literal('')),
  ownerCpf: z.string().optional(),
  ownerAddress: z.string().optional(),
  ownerNotes: z.string().optional(),
  emergencyFlag: z.boolean().optional(),
  responsibleVet: z.string().optional(),
  originClinic: z.string().optional(),
  anestheticRiskScore: z.number().int().min(0).max(5).optional(),
});

// Schema para criação de consulta
const createConsultationSchema = z.object({
  patientId: z.string().uuid('ID de paciente inválido'),
  consultationType: z.enum(['nova', 'retorno', 'emergencia']).optional(),
  weight: z.number().positive().optional(),
  temperature: z.number().min(30).max(45).optional(),
  heartRate: z.number().int().positive().optional(),
  respiratoryRate: z.number().int().positive().optional(),
  chiefComplaint: z.string().optional(),
  anamnesis: z.string().optional(),
  physicalExam: z.string().optional(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  procedures: z.string().optional(),
  medications: z.string().optional(),
  notes: z.string().optional(),
  returnRecommendation: z.string().optional(),
  vaccinationUpToDate: z.boolean().optional(),
});

// Schema para criação de agendamento
const createAppointmentSchema = z.object({
  patientId: z.string().uuid('ID de paciente inválido'),
  date: z.string().min(1, 'Data é obrigatória'),
  time: z.string().min(1, 'Hora é obrigatória'),
  reason: z.string().min(1, 'Motivo é obrigatório'),
  type: z.enum(['consulta', 'cirurgia', 'retorno']).optional(),
});

// Schema para atualização de perfil
const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  profilePhoto: z.string().url().optional().or(z.literal('')),
  signature: z.string().url().optional().or(z.literal('')),
});

// Schema para chat assist
const chatAssistSchema = z.object({
  mode: z.enum(['nova', 'retorno']).optional(),
  patientId: z.string().uuid().optional(),
  text: z.string().optional(),
  transcript: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .optional(),
  segments: z
    .array(
      z.object({
        stamp: z.string(),
        speaker: z.string(),
        text: z.string(),
      }),
    )
    .optional(),
  recordProfile: z
    .object({
      porte: z.enum(['pequeno', 'grande']).optional(),
      specificFieldKeys: z.array(z.string()).optional(),
    })
    .optional(),
});

// ============================================
// MIDDLEWARE DE VALIDAÇÃO
// ============================================

function validate(schema) {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.body);
      req.validatedData = validatedData;
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          error: 'Dados inválidos',
          details: errors,
        });
      }
      return res.status(500).json({ error: 'Erro de validação' });
    }
  };
}

// Middlewares de validação pré-definidos
const validateCreatePatient = validate(createPatientSchema);
const validateCreateConsultation = validate(createConsultationSchema);
const validateCreateAppointment = validate(createAppointmentSchema);
const validateUpdateProfile = validate(updateProfileSchema);
const validateChatAssist = validate(chatAssistSchema);

module.exports = {
  validate,
  createPatientSchema,
  createConsultationSchema,
  createAppointmentSchema,
  updateProfileSchema,
  chatAssistSchema,
  validateCreatePatient,
  validateCreateConsultation,
  validateCreateAppointment,
  validateUpdateProfile,
  validateChatAssist,
};
