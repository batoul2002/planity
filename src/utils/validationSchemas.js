const Joi = require('joi');

const objectId = () => Joi.string().hex().length(24);

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('client', 'planner', 'admin').optional(),
  phone: Joi.string().allow('', null),
  locale: Joi.string().valid('en', 'ar').optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const profileUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  avatar: Joi.string().uri().allow('', null),
  phone: Joi.string().allow('', null),
  locale: Joi.string().valid('en', 'ar').optional()
}).min(1);

const vendorCreateSchema = Joi.object({
  name: Joi.string().required(),
  category: Joi.string().valid('venue', 'photographer', 'catering', 'decorator', 'dj', 'invitation').required(),
  pricing: Joi.object({
    type: Joi.string().valid('per-person', 'package').required(),
    amount: Joi.number().positive().required()
  }).required(),
  city: Joi.string().required(),
  amenities: Joi.array().items(Joi.string()).optional(),
  styles: Joi.array().items(Joi.string()).optional(),
  cuisines: Joi.array().items(Joi.string()).optional(),
  dietaryOptions: Joi.array().items(Joi.string()).optional(),
  photos: Joi.array().items(Joi.string()).optional(),
  verified: Joi.boolean().optional()
});

const vendorUpdateSchema = vendorCreateSchema.fork(
  ['name', 'category', 'pricing', 'city'],
  field => field.optional()
);

const vendorPhotoDeleteSchema = Joi.object({
  photo: Joi.string().uri().required()
});

const eventCreateSchema = Joi.object({
  type: Joi.string().required(),
  theme: Joi.string().allow('', null),
  date: Joi.date().iso().required(),
  budget: Joi.number().positive().required(),
  guests: Joi.number().integer().min(1).required(),
  location: Joi.string().required(),
  notes: Joi.string().allow('', null),
  plannerId: objectId().optional(),
  vendors: Joi.array().items(objectId()).optional()
});

const eventUpdateDetailsSchema = Joi.object({
  type: Joi.string(),
  theme: Joi.string().allow('', null),
  date: Joi.date().iso(),
  budget: Joi.number().positive(),
  guests: Joi.number().integer().min(1),
  location: Joi.string(),
  notes: Joi.string().allow('', null)
}).min(1);

const eventAssignPlannerSchema = Joi.object({
  plannerId: objectId().required()
});

const eventStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending_assignment', 'assigned', 'draft', 'planning', 'confirmed', 'completed', 'cancelled')
    .required()
});

const eventPlanningStepSchema = Joi.object({
  planningStep: Joi.number().integer().min(1).required()
});

const eventTaskCreateSchema = Joi.object({
  title: Joi.string().required(),
  dueDate: Joi.date().iso().optional(),
  assignedTo: objectId().allow(null).optional()
});

const eventTaskUpdateSchema = Joi.object({
  title: Joi.string(),
  completed: Joi.boolean(),
  dueDate: Joi.date().iso(),
  assignedTo: objectId().allow(null)
}).min(1);

const eventVendorSchema = Joi.object({
  vendorId: objectId().required()
});

const eventRescheduleSchema = Joi.object({
  date: Joi.date().iso().required(),
  location: Joi.string().optional()
});

const eventBudgetSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        label: Joi.string().required(),
        amount: Joi.number().precision(2).min(0).required(),
        vendor: objectId().allow(null),
        notes: Joi.string().allow('', null)
      })
    )
    .min(0)
    .required()
});

const adminUpdateUserRoleSchema = Joi.object({
  role: Joi.string().valid('client', 'planner', 'admin').required()
});

const adminVerifyVendorSchema = Joi.object({
  verified: Joi.boolean().required()
});

const adminUpdateUserStatusSchema = Joi.object({
  isActive: Joi.boolean().required()
});

const adminUpdateVendorStatusSchema = Joi.object({
  isActive: Joi.boolean().required()
});

const adminAssignPlannerSchema = Joi.object({
  plannerId: objectId().required()
});

const adminCreatePlannerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().allow('', null),
  isActive: Joi.boolean().optional()
});

const adminUpdatePlannerSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  email: Joi.string().email(),
  phone: Joi.string().allow('', null)
}).min(1);

const adminPlannerStatusSchema = Joi.object({
  isActive: Joi.boolean().required()
});

const contractCreateSchema = Joi.object({
  eventId: objectId().required(),
  vendorId: objectId().optional(),
  parties: Joi.array().items(objectId()).optional(),
  text: Joi.string().min(10).required()
});

const contractQuerySchema = Joi.object({
  eventId: objectId().optional()
});

const paymentIntentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().trim().lowercase().valid('usd', 'eur', 'gbp', 'cad', 'aed', 'sar', 'kwd').default('usd'),
  referenceType: Joi.string().valid('event', 'contract').optional(),
  referenceId: objectId().when('referenceType', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  description: Joi.string().optional()
});

const paymentStatusSchema = Joi.object({
  referenceType: Joi.string().valid('event', 'contract').required(),
  referenceId: objectId().required(),
  paid: Joi.boolean().required()
});

const eventCalendarQuerySchema = Joi.object({
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  plannerId: objectId().optional()
});

const disputeCreateSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow('', null),
  eventId: objectId().optional(),
  contractId: objectId().optional(),
  raisedBy: objectId().required(),
  against: objectId().optional()
});

const disputeUpdateSchema = Joi.object({
  status: Joi.string().valid('open', 'in_review', 'resolved'),
  resolutionNotes: Joi.string().allow('', null)
}).min(1);

const metaOptionCreateSchema = Joi.object({
  category: Joi.string().valid('event-type', 'service-category').required(),
  key: Joi.string().required(),
  labels: Joi.object({
    en: Joi.string().required(),
    ar: Joi.string().required()
  }).required(),
  order: Joi.number().integer().optional(),
  isActive: Joi.boolean().optional()
});

const metaOptionUpdateSchema = Joi.object({
  key: Joi.string().optional(),
  labels: Joi.object({
    en: Joi.string().required(),
    ar: Joi.string().required()
  }).optional(),
  order: Joi.number().integer().optional(),
  isActive: Joi.boolean().optional()
}).min(1);

const metaOptionListSchema = Joi.object({
  category: Joi.string().valid('event-type', 'service-category').optional()
});

const plannerItemCreateSchema = Joi.object({
  title: Joi.string().min(2).max(120).required(),
  service: Joi.string().min(2).max(120).required(),
  eventType: Joi.string().allow('', null),
  category: Joi.string().allow('', null),
  clientKey: Joi.string().max(200).allow('', null),
  priceMin: Joi.number().min(0).optional(),
  priceMax: Joi.number().min(0).optional(),
  image: Joi.string().allow('', null),
  description: Joi.string().allow('', null),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'deleted').optional(),
  source: Joi.string().allow('', null)
});

const plannerItemUpdateSchema = Joi.object({
  title: Joi.string().min(2).max(120),
  service: Joi.string().min(2).max(120),
  eventType: Joi.string().allow('', null),
  category: Joi.string().allow('', null),
  clientKey: Joi.string().max(200).allow('', null),
  priceMin: Joi.number().min(0),
  priceMax: Joi.number().min(0),
  image: Joi.string().allow('', null),
  description: Joi.string().allow('', null),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'deleted')
}).min(1);

const plannerItemChangeCreateSchema = Joi.object({
  action: Joi.string().valid('create', 'update', 'delete').required(),
  itemId: objectId().optional(),
  clientKey: Joi.string().max(200).optional(),
  itemData: Joi.object().when('action', { is: Joi.valid('create', 'update'), then: Joi.required(), otherwise: Joi.optional() }),
  note: Joi.string().allow('', null)
}).custom((value, helpers) => {
  if ((value.action === 'update' || value.action === 'delete') && !value.itemId && !value.clientKey) {
    return helpers.error('any.custom', { message: 'itemId or clientKey is required for update/delete' });
  }
  return value;
});

const plannerItemChangeDecisionSchema = Joi.object({
  note: Joi.string().allow('', null)
});

// Add other schemas similarly...

module.exports = {
  registerSchema,
  loginSchema,
  profileUpdateSchema,
  vendorCreateSchema,
  vendorUpdateSchema,
  vendorPhotoDeleteSchema,
  eventCreateSchema,
  eventUpdateDetailsSchema,
  eventAssignPlannerSchema,
  eventStatusSchema,
  eventPlanningStepSchema,
  eventTaskCreateSchema,
  eventTaskUpdateSchema,
  eventVendorSchema,
  eventRescheduleSchema,
  eventBudgetSchema,
  adminUpdateUserRoleSchema,
  adminVerifyVendorSchema,
  adminUpdateUserStatusSchema,
  adminUpdateVendorStatusSchema,
  adminAssignPlannerSchema,
  adminCreatePlannerSchema,
  adminUpdatePlannerSchema,
  adminPlannerStatusSchema,
  contractCreateSchema,
  contractQuerySchema,
  paymentIntentSchema,
  paymentStatusSchema,
  eventCalendarQuerySchema,
  disputeCreateSchema,
  disputeUpdateSchema,
  metaOptionCreateSchema,
  metaOptionUpdateSchema,
  metaOptionListSchema,
  plannerItemCreateSchema,
  plannerItemUpdateSchema,
  plannerItemChangeCreateSchema,
  plannerItemChangeDecisionSchema,
  // other schemas...
};
