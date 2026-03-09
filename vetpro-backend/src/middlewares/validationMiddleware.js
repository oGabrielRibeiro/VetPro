const { z } = require('zod');

// Validação base de paciente
// Campos mais flexíveis para manter compatibilidade retroativa
const patientBaseSchema = z.object({
  name: z.string().optional(),
  specie: z.string().optional(),
  // Alias usado no frontend em alguns fluxos
  species: z.string().optional(),
  subcategory: z.string().optional(),
  breed: z.string().optional(),
  sex: z.string().optional(),
  age: z.number().int().positive().optional(),
  birthDate: z.string().optional(),
  weight: z.number().positive().optional(),
  color: z.string().optional(),
  microchip: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal('')),
  // Aceita qualquer string e normaliza no service para manter compatibilidade
  porte: z.string().optional(),
  ownerName: z.string().optional(),
  ownerPhone: z.string().optional(),
  ownerAltPhone: z.string().optional(),
  ownerEmail: z.string().email().optional().or(z.literal('')),
  ownerCpf: z.string().optional(),
  ownerAddress: z.string().optional(),
  ownerNotes: z.string().optional(),
});

// Validação para criação de paciente
const createPatientSchema = patientBaseSchema;

// Validação para atualização de paciente
const updatePatientSchema = patientBaseSchema.partial();

// Validação para substituição completa (PUT)
const replacePatientSchema = patientBaseSchema
  .extend({
    name: z.string().min(1, 'Nome do paciente e obrigatorio.'),
    ownerName: z.string().min(1, 'Tutor obrigatorio para criar paciente.'),
  })
  .refine(
    (data) => String(data.specie || data.species || '').trim().length > 0,
    {
      path: ['specie'],
      message: 'Especie e obrigatoria.',
    },
  );

// Validação para criação de consulta
const createConsultationSchema = z.object({
  patientId: z.string().uuid('ID de paciente inválido').optional(),
  consultationType: z
    .enum(['nova', 'consulta', 'retorno', 'emergencia', 'checkup'])
    .optional(),
  chiefComplaint: z.string().optional(),
  anamnesis: z.string().optional(),
  physicalExam: z.string().optional(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  procedures: z.string().optional(),
  medications: z.string().optional(),
  notes: z.string().optional(),
  returnRecommendation: z.string().optional(),
  weight: z.number().positive().optional(),
  temperature: z.number().min(30).max(45).optional(),
  heartRate: z.number().int().positive().optional(),
  respiratoryRate: z.number().int().positive().optional(),
  vaccinationUpToDate: z.boolean().optional(),
});

// Validação para criação de usuário (cadastro)
const createUserSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  crmv: z.string().optional(),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  clinicId: z.string().uuid('ID de clínica inválido'),
});

// Validação para login
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

// Middleware factory para validar schema
const validate = (schema) => (req, res, next) => {
  try {
    // Skip validation if body is empty
    if (!req.body || Object.keys(req.body).length === 0) {
      return next();
    }
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
    return res.status(500).json({ error: 'Erro interno de validação' });
  }
};

module.exports = {
  validate,
  createPatientSchema,
  updatePatientSchema,
  replacePatientSchema,
  createConsultationSchema,
  createUserSchema,
  loginSchema,
};
