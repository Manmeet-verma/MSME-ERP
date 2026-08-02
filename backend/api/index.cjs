var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/lib/logger.ts
var logger_exports = {};
__export(logger_exports, {
  logger: () => logger
});
var import_pino, usePrettyTransport, logger;
var init_logger = __esm({
  "src/lib/logger.ts"() {
    import_pino = __toESM(require("pino"), 1);
    usePrettyTransport = process.env.NODE_ENV === "development" && !process.env.VERCEL;
    logger = (0, import_pino.default)({
      level: process.env.LOG_LEVEL ?? "info",
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers['set-cookie']"
      ],
      ...usePrettyTransport ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true }
        }
      } : {}
    });
  }
});

// src/app.ts
var app_exports = {};
__export(app_exports, {
  default: () => app_default
});
module.exports = __toCommonJS(app_exports);
var import_express44 = __toESM(require("express"), 1);

// src/routes/index.ts
var import_express43 = require("express");

// src/routes/health.ts
var import_express = require("express");

// src/lib/api-zod/generated/api.ts
var zod = __toESM(require("zod"), 1);
var HealthCheckResponse = zod.object({
  "status": zod.enum(["ok"])
});
var SignupBody = zod.object({
  "name": zod.string(),
  "email": zod.string(),
  "password": zod.string()
});
var SignupWithOrgBody = zod.object({
  "name": zod.string(),
  "email": zod.string(),
  "password": zod.string(),
  "organizationName": zod.string(),
  "industry": zod.string().optional()
});
var LoginBody = zod.object({
  "email": zod.string(),
  "password": zod.string()
});
var LoginResponse = zod.object({
  "token": zod.string(),
  "user": zod.object({
    "id": zod.number(),
    "name": zod.string(),
    "email": zod.string(),
    "phone": zod.string().nullish()
  }),
  "activeOrgId": zod.number().nullable(),
  "organizations": zod.array(zod.object({
    "id": zod.number(),
    "name": zod.string(),
    "slug": zod.string(),
    "role": zod.enum(["owner", "admin", "sales", "viewer"])
  }))
});
var GetMeResponse = zod.object({
  "user": zod.object({
    "id": zod.number(),
    "name": zod.string(),
    "email": zod.string(),
    "phone": zod.string().nullish()
  }),
  "activeOrgId": zod.number().nullable(),
  "organizations": zod.array(zod.object({
    "id": zod.number(),
    "name": zod.string(),
    "slug": zod.string(),
    "role": zod.enum(["owner", "admin", "sales", "viewer"])
  }))
});
var SwitchOrgBody = zod.object({
  "organizationId": zod.number()
});
var SwitchOrgResponse = zod.object({
  "token": zod.string(),
  "activeOrgId": zod.number(),
  "role": zod.enum(["owner", "admin", "sales", "viewer"])
});
var LogoutResponse = zod.object({
  "message": zod.string()
});
var createOrganizationBodyPayrollSettingsAutoRunDayMax = 28;
var CreateOrganizationBody = zod.object({
  "name": zod.string(),
  "industry": zod.string().optional(),
  "gstNumber": zod.string().optional(),
  "state": zod.string().optional(),
  "address": zod.string().optional(),
  "phone": zod.string().optional(),
  "salesSettings": zod.object({
    "allowOverselling": zod.boolean(),
    "reserveStockOnDraft": zod.boolean()
  }).optional(),
  "payrollSettings": zod.object({
    "autoRunEnabled": zod.boolean(),
    "autoRunDay": zod.number().min(1).max(createOrganizationBodyPayrollSettingsAutoRunDayMax),
    "emailPayslips": zod.boolean()
  }).optional()
});
var getCurrentOrganizationResponsePayrollSettingsAutoRunDayMax = 28;
var GetCurrentOrganizationResponse = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "slug": zod.string(),
  "plan": zod.enum(["free", "starter", "pro"]),
  "industry": zod.string().nullish(),
  "gstNumber": zod.string().nullish(),
  "state": zod.string().nullish(),
  "address": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "limits": zod.object({
    "members": zod.number(),
    "leadsPerMonth": zod.number(),
    "emailsPerMonth": zod.number(),
    "storageMB": zod.number()
  }),
  "modules": zod.object({
    "sales": zod.boolean(),
    "leads": zod.boolean(),
    "inventory": zod.boolean(),
    "purchase": zod.boolean(),
    "marketing": zod.boolean(),
    "hr": zod.boolean(),
    "accounting": zod.boolean(),
    "social": zod.boolean()
  }),
  "salesSettings": zod.object({
    "allowOverselling": zod.boolean(),
    "reserveStockOnDraft": zod.boolean()
  }),
  "payrollSettings": zod.object({
    "autoRunEnabled": zod.boolean(),
    "autoRunDay": zod.number().min(1).max(getCurrentOrganizationResponsePayrollSettingsAutoRunDayMax),
    "emailPayslips": zod.boolean()
  }),
  "createdAt": zod.string()
});
var updateCurrentOrganizationBodyPayrollSettingsAutoRunDayMax = 28;
var UpdateCurrentOrganizationBody = zod.object({
  "name": zod.string().optional(),
  "industry": zod.string().optional(),
  "gstNumber": zod.string().optional(),
  "state": zod.string().optional(),
  "address": zod.string().optional(),
  "phone": zod.string().optional(),
  "salesSettings": zod.object({
    "allowOverselling": zod.boolean(),
    "reserveStockOnDraft": zod.boolean()
  }).optional(),
  "payrollSettings": zod.object({
    "autoRunEnabled": zod.boolean(),
    "autoRunDay": zod.number().min(1).max(updateCurrentOrganizationBodyPayrollSettingsAutoRunDayMax),
    "emailPayslips": zod.boolean()
  }).optional()
});
var updateCurrentOrganizationResponsePayrollSettingsAutoRunDayMax = 28;
var UpdateCurrentOrganizationResponse = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "slug": zod.string(),
  "plan": zod.enum(["free", "starter", "pro"]),
  "industry": zod.string().nullish(),
  "gstNumber": zod.string().nullish(),
  "state": zod.string().nullish(),
  "address": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "limits": zod.object({
    "members": zod.number(),
    "leadsPerMonth": zod.number(),
    "emailsPerMonth": zod.number(),
    "storageMB": zod.number()
  }),
  "modules": zod.object({
    "sales": zod.boolean(),
    "leads": zod.boolean(),
    "inventory": zod.boolean(),
    "purchase": zod.boolean(),
    "marketing": zod.boolean(),
    "hr": zod.boolean(),
    "accounting": zod.boolean(),
    "social": zod.boolean()
  }),
  "salesSettings": zod.object({
    "allowOverselling": zod.boolean(),
    "reserveStockOnDraft": zod.boolean()
  }),
  "payrollSettings": zod.object({
    "autoRunEnabled": zod.boolean(),
    "autoRunDay": zod.number().min(1).max(updateCurrentOrganizationResponsePayrollSettingsAutoRunDayMax),
    "emailPayslips": zod.boolean()
  }),
  "createdAt": zod.string()
});
var UpdateOrganizationModulesBody = zod.object({
  "sales": zod.boolean().optional(),
  "leads": zod.boolean().optional(),
  "inventory": zod.boolean().optional(),
  "purchase": zod.boolean().optional(),
  "marketing": zod.boolean().optional(),
  "hr": zod.boolean().optional(),
  "accounting": zod.boolean().optional(),
  "social": zod.boolean().optional()
});
var updateOrganizationModulesResponsePayrollSettingsAutoRunDayMax = 28;
var UpdateOrganizationModulesResponse = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "slug": zod.string(),
  "plan": zod.enum(["free", "starter", "pro"]),
  "industry": zod.string().nullish(),
  "gstNumber": zod.string().nullish(),
  "state": zod.string().nullish(),
  "address": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "limits": zod.object({
    "members": zod.number(),
    "leadsPerMonth": zod.number(),
    "emailsPerMonth": zod.number(),
    "storageMB": zod.number()
  }),
  "modules": zod.object({
    "sales": zod.boolean(),
    "leads": zod.boolean(),
    "inventory": zod.boolean(),
    "purchase": zod.boolean(),
    "marketing": zod.boolean(),
    "hr": zod.boolean(),
    "accounting": zod.boolean(),
    "social": zod.boolean()
  }),
  "salesSettings": zod.object({
    "allowOverselling": zod.boolean(),
    "reserveStockOnDraft": zod.boolean()
  }),
  "payrollSettings": zod.object({
    "autoRunEnabled": zod.boolean(),
    "autoRunDay": zod.number().min(1).max(updateOrganizationModulesResponsePayrollSettingsAutoRunDayMax),
    "emailPayslips": zod.boolean()
  }),
  "createdAt": zod.string()
});
var ListMembersResponseItem = zod.object({
  "id": zod.number(),
  "userId": zod.number(),
  "name": zod.string(),
  "email": zod.string(),
  "role": zod.enum(["owner", "admin", "sales", "viewer"]),
  "isActive": zod.boolean(),
  "lastLogin": zod.string().nullish(),
  "joinedAt": zod.string()
});
var ListMembersResponse = zod.array(ListMembersResponseItem);
var UpdateMemberRoleParams = zod.object({
  "userId": zod.coerce.number()
});
var UpdateMemberRoleBody = zod.object({
  "role": zod.enum(["owner", "admin", "sales", "viewer"])
});
var UpdateMemberRoleResponse = zod.object({
  "message": zod.string()
});
var RemoveMemberParams = zod.object({
  "userId": zod.coerce.number()
});
var RemoveMemberResponse = zod.object({
  "message": zod.string()
});
var ListInvitationsResponseItem = zod.object({
  "id": zod.number(),
  "email": zod.string(),
  "role": zod.enum(["admin", "sales", "viewer"]),
  "token": zod.string(),
  "acceptUrl": zod.string().optional(),
  "acceptedAt": zod.string().nullish(),
  "expiresAt": zod.string(),
  "createdAt": zod.string()
});
var ListInvitationsResponse = zod.array(ListInvitationsResponseItem);
var CreateInvitationBody = zod.object({
  "email": zod.string(),
  "role": zod.enum(["admin", "sales", "viewer"])
});
var RevokeInvitationParams = zod.object({
  "id": zod.coerce.number()
});
var RevokeInvitationResponse = zod.object({
  "message": zod.string()
});
var GetInvitationParams = zod.object({
  "token": zod.coerce.string()
});
var GetInvitationResponse = zod.object({
  "email": zod.string(),
  "role": zod.enum(["admin", "sales", "viewer"]),
  "organizationId": zod.number(),
  "organizationName": zod.string(),
  "accepted": zod.boolean(),
  "expired": zod.boolean(),
  "expiresAt": zod.string()
});
var AcceptInvitationParams = zod.object({
  "token": zod.coerce.string()
});
var AcceptInvitationResponse = zod.object({
  "token": zod.string(),
  "activeOrgId": zod.number(),
  "role": zod.enum(["owner", "admin", "sales", "viewer"])
});
var ListClientsResponseItem = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "email": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "company": zod.string().nullish(),
  "address": zod.string().nullish(),
  "city": zod.string().nullish(),
  "state": zod.string().nullish(),
  "gstNumber": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "quotationCount": zod.number().optional(),
  "totalValue": zod.number().optional(),
  "createdAt": zod.string()
});
var ListClientsResponse = zod.array(ListClientsResponseItem);
var CreateClientBody = zod.object({
  "name": zod.string(),
  "email": zod.string().optional(),
  "phone": zod.string().optional(),
  "company": zod.string().optional(),
  "address": zod.string().optional(),
  "city": zod.string().optional(),
  "state": zod.string().optional(),
  "gstNumber": zod.string().optional(),
  "notes": zod.string().optional()
});
var GetClientParams = zod.object({
  "id": zod.coerce.number()
});
var GetClientResponse = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "email": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "company": zod.string().nullish(),
  "address": zod.string().nullish(),
  "city": zod.string().nullish(),
  "state": zod.string().nullish(),
  "gstNumber": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "quotationCount": zod.number().optional(),
  "totalValue": zod.number().optional(),
  "createdAt": zod.string()
});
var UpdateClientParams = zod.object({
  "id": zod.coerce.number()
});
var UpdateClientBody = zod.object({
  "name": zod.string().optional(),
  "email": zod.string().optional(),
  "phone": zod.string().optional(),
  "company": zod.string().optional(),
  "address": zod.string().optional(),
  "city": zod.string().optional(),
  "state": zod.string().optional(),
  "gstNumber": zod.string().optional(),
  "notes": zod.string().optional()
});
var UpdateClientResponse = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "email": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "company": zod.string().nullish(),
  "address": zod.string().nullish(),
  "city": zod.string().nullish(),
  "state": zod.string().nullish(),
  "gstNumber": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "quotationCount": zod.number().optional(),
  "totalValue": zod.number().optional(),
  "createdAt": zod.string()
});
var DeleteClientParams = zod.object({
  "id": zod.coerce.number()
});
var DeleteClientResponse = zod.object({
  "message": zod.string()
});
var ListProductsQueryParams = zod.object({
  "category": zod.coerce.string().optional(),
  "isActive": zod.coerce.boolean().optional()
});
var ListProductsResponseItem = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "category": zod.string(),
  "description": zod.string().nullish(),
  "unit": zod.string(),
  "basePrice": zod.number(),
  "pixelPitch": zod.string().nullish(),
  "resolution": zod.string().nullish(),
  "brightness": zod.string().nullish(),
  "application": zod.string().nullish(),
  "isActive": zod.boolean(),
  "createdAt": zod.string()
});
var ListProductsResponse = zod.array(ListProductsResponseItem);
var CreateProductBody = zod.object({
  "name": zod.string(),
  "category": zod.string(),
  "description": zod.string().optional(),
  "unit": zod.string(),
  "basePrice": zod.number(),
  "pixelPitch": zod.string().optional(),
  "resolution": zod.string().optional(),
  "brightness": zod.string().optional(),
  "application": zod.string().optional(),
  "isActive": zod.boolean().optional()
});
var GetProductParams = zod.object({
  "id": zod.coerce.number()
});
var GetProductResponse = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "category": zod.string(),
  "description": zod.string().nullish(),
  "unit": zod.string(),
  "basePrice": zod.number(),
  "pixelPitch": zod.string().nullish(),
  "resolution": zod.string().nullish(),
  "brightness": zod.string().nullish(),
  "application": zod.string().nullish(),
  "isActive": zod.boolean(),
  "createdAt": zod.string()
});
var UpdateProductParams = zod.object({
  "id": zod.coerce.number()
});
var UpdateProductBody = zod.object({
  "name": zod.string().optional(),
  "category": zod.string().optional(),
  "description": zod.string().optional(),
  "unit": zod.string().optional(),
  "basePrice": zod.number().optional(),
  "pixelPitch": zod.string().optional(),
  "resolution": zod.string().optional(),
  "brightness": zod.string().optional(),
  "application": zod.string().optional(),
  "isActive": zod.boolean().optional()
});
var UpdateProductResponse = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "category": zod.string(),
  "description": zod.string().nullish(),
  "unit": zod.string(),
  "basePrice": zod.number(),
  "pixelPitch": zod.string().nullish(),
  "resolution": zod.string().nullish(),
  "brightness": zod.string().nullish(),
  "application": zod.string().nullish(),
  "isActive": zod.boolean(),
  "createdAt": zod.string()
});
var DeleteProductParams = zod.object({
  "id": zod.coerce.number()
});
var DeleteProductResponse = zod.object({
  "message": zod.string()
});
var ListAddonsResponseItem = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "description": zod.string().nullish(),
  "price": zod.number(),
  "priceType": zod.enum(["fixed", "percentage"]),
  "category": zod.string(),
  "isActive": zod.boolean()
});
var ListAddonsResponse = zod.array(ListAddonsResponseItem);
var CreateAddonBody = zod.object({
  "name": zod.string(),
  "description": zod.string().optional(),
  "price": zod.number(),
  "priceType": zod.enum(["fixed", "percentage"]),
  "category": zod.string(),
  "isActive": zod.boolean().optional()
});
var UpdateAddonParams = zod.object({
  "id": zod.coerce.number()
});
var UpdateAddonBody = zod.object({
  "name": zod.string().optional(),
  "description": zod.string().optional(),
  "price": zod.number().optional(),
  "priceType": zod.enum(["fixed", "percentage"]).optional(),
  "category": zod.string().optional(),
  "isActive": zod.boolean().optional()
});
var UpdateAddonResponse = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "description": zod.string().nullish(),
  "price": zod.number(),
  "priceType": zod.enum(["fixed", "percentage"]),
  "category": zod.string(),
  "isActive": zod.boolean()
});
var DeleteAddonParams = zod.object({
  "id": zod.coerce.number()
});
var DeleteAddonResponse = zod.object({
  "message": zod.string()
});
var ListQuotationsQueryParams = zod.object({
  "status": zod.coerce.string().optional(),
  "clientId": zod.coerce.number().optional(),
  "search": zod.coerce.string().optional()
});
var ListQuotationsResponseItem = zod.object({
  "id": zod.number(),
  "quotationNumber": zod.string(),
  "clientId": zod.number().nullish(),
  "clientName": zod.string().nullish(),
  "clientCompany": zod.string().nullish(),
  "createdByName": zod.string().nullish(),
  "status": zod.enum(["draft", "sent", "approved", "rejected", "expired"]),
  "validUntil": zod.string().nullish(),
  "subtotal": zod.number(),
  "discountAmount": zod.number(),
  "discountPercent": zod.number().optional(),
  "taxAmount": zod.number(),
  "taxPercent": zod.number().optional(),
  "total": zod.number(),
  "notes": zod.string().nullish(),
  "terms": zod.string().nullish(),
  "itemCount": zod.number().optional(),
  "createdAt": zod.string(),
  "updatedAt": zod.string()
});
var ListQuotationsResponse = zod.array(ListQuotationsResponseItem);
var CreateQuotationBody = zod.object({
  "clientId": zod.number().optional(),
  "validUntil": zod.string().optional(),
  "notes": zod.string().optional(),
  "terms": zod.string().optional(),
  "discountPercent": zod.number().optional(),
  "taxPercent": zod.number().optional()
});
var GetQuotationParams = zod.object({
  "id": zod.coerce.number()
});
var GetQuotationResponse = zod.object({
  "id": zod.number(),
  "quotationNumber": zod.string(),
  "clientId": zod.number().nullish(),
  "clientName": zod.string().nullish(),
  "clientCompany": zod.string().nullish(),
  "clientEmail": zod.string().nullish(),
  "clientPhone": zod.string().nullish(),
  "clientAddress": zod.string().nullish(),
  "clientGstNumber": zod.string().nullish(),
  "createdByName": zod.string().nullish(),
  "status": zod.enum(["draft", "sent", "approved", "rejected", "expired"]),
  "validUntil": zod.string().nullish(),
  "subtotal": zod.number(),
  "discountAmount": zod.number(),
  "discountPercent": zod.number().optional(),
  "taxAmount": zod.number(),
  "taxPercent": zod.number().optional(),
  "total": zod.number(),
  "notes": zod.string().nullish(),
  "terms": zod.string().nullish(),
  "items": zod.array(zod.object({
    "id": zod.number(),
    "quotationId": zod.number(),
    "productId": zod.number().nullish(),
    "productName": zod.string().nullish(),
    "itemId": zod.number().nullish(),
    "itemName": zod.string().nullish(),
    "description": zod.string(),
    "widthFt": zod.number().nullish(),
    "heightFt": zod.number().nullish(),
    "areaSqFt": zod.number().nullish(),
    "quantity": zod.number(),
    "unitPrice": zod.number(),
    "totalPrice": zod.number(),
    "notes": zod.string().nullish()
  })),
  "quotationAddons": zod.array(zod.object({
    "id": zod.number(),
    "quotationId": zod.number(),
    "addonId": zod.number().nullish(),
    "addonName": zod.string().nullish(),
    "description": zod.string(),
    "quantity": zod.number(),
    "price": zod.number(),
    "totalPrice": zod.number()
  })),
  "createdAt": zod.string(),
  "updatedAt": zod.string()
});
var UpdateQuotationParams = zod.object({
  "id": zod.coerce.number()
});
var UpdateQuotationBody = zod.object({
  "clientId": zod.number().optional(),
  "validUntil": zod.string().optional(),
  "notes": zod.string().optional(),
  "terms": zod.string().optional(),
  "discountPercent": zod.number().optional(),
  "taxPercent": zod.number().optional()
});
var UpdateQuotationResponse = zod.object({
  "id": zod.number(),
  "quotationNumber": zod.string(),
  "clientId": zod.number().nullish(),
  "clientName": zod.string().nullish(),
  "clientCompany": zod.string().nullish(),
  "createdByName": zod.string().nullish(),
  "status": zod.enum(["draft", "sent", "approved", "rejected", "expired"]),
  "validUntil": zod.string().nullish(),
  "subtotal": zod.number(),
  "discountAmount": zod.number(),
  "discountPercent": zod.number().optional(),
  "taxAmount": zod.number(),
  "taxPercent": zod.number().optional(),
  "total": zod.number(),
  "notes": zod.string().nullish(),
  "terms": zod.string().nullish(),
  "itemCount": zod.number().optional(),
  "createdAt": zod.string(),
  "updatedAt": zod.string()
});
var DeleteQuotationParams = zod.object({
  "id": zod.coerce.number()
});
var DeleteQuotationResponse = zod.object({
  "message": zod.string()
});
var UpdateQuotationStatusParams = zod.object({
  "id": zod.coerce.number()
});
var UpdateQuotationStatusBody = zod.object({
  "status": zod.enum(["draft", "sent", "approved", "rejected", "expired"])
});
var UpdateQuotationStatusResponse = zod.object({
  "id": zod.number(),
  "quotationNumber": zod.string(),
  "clientId": zod.number().nullish(),
  "clientName": zod.string().nullish(),
  "clientCompany": zod.string().nullish(),
  "createdByName": zod.string().nullish(),
  "status": zod.enum(["draft", "sent", "approved", "rejected", "expired"]),
  "validUntil": zod.string().nullish(),
  "subtotal": zod.number(),
  "discountAmount": zod.number(),
  "discountPercent": zod.number().optional(),
  "taxAmount": zod.number(),
  "taxPercent": zod.number().optional(),
  "total": zod.number(),
  "notes": zod.string().nullish(),
  "terms": zod.string().nullish(),
  "itemCount": zod.number().optional(),
  "createdAt": zod.string(),
  "updatedAt": zod.string()
});
var DuplicateQuotationParams = zod.object({
  "id": zod.coerce.number()
});
var AddQuotationItemParams = zod.object({
  "id": zod.coerce.number()
});
var AddQuotationItemBody = zod.object({
  "productId": zod.number().optional(),
  "itemId": zod.number().nullish(),
  "description": zod.string(),
  "widthFt": zod.number().optional(),
  "heightFt": zod.number().optional(),
  "quantity": zod.number(),
  "unitPrice": zod.number(),
  "notes": zod.string().optional()
});
var UpdateQuotationItemParams = zod.object({
  "id": zod.coerce.number(),
  "itemId": zod.coerce.number()
});
var UpdateQuotationItemBody = zod.object({
  "productId": zod.number().optional(),
  "itemId": zod.number().nullish(),
  "description": zod.string().optional(),
  "widthFt": zod.number().optional(),
  "heightFt": zod.number().optional(),
  "quantity": zod.number().optional(),
  "unitPrice": zod.number().optional(),
  "notes": zod.string().optional()
});
var UpdateQuotationItemResponse = zod.object({
  "id": zod.number(),
  "quotationId": zod.number(),
  "productId": zod.number().nullish(),
  "productName": zod.string().nullish(),
  "itemId": zod.number().nullish(),
  "itemName": zod.string().nullish(),
  "description": zod.string(),
  "widthFt": zod.number().nullish(),
  "heightFt": zod.number().nullish(),
  "areaSqFt": zod.number().nullish(),
  "quantity": zod.number(),
  "unitPrice": zod.number(),
  "totalPrice": zod.number(),
  "notes": zod.string().nullish()
});
var DeleteQuotationItemParams = zod.object({
  "id": zod.coerce.number(),
  "itemId": zod.coerce.number()
});
var DeleteQuotationItemResponse = zod.object({
  "message": zod.string()
});
var AddQuotationAddonParams = zod.object({
  "id": zod.coerce.number()
});
var AddQuotationAddonBody = zod.object({
  "addonId": zod.number().optional(),
  "description": zod.string(),
  "quantity": zod.number(),
  "price": zod.number()
});
var DeleteQuotationAddonParams = zod.object({
  "id": zod.coerce.number(),
  "addonId": zod.coerce.number()
});
var DeleteQuotationAddonResponse = zod.object({
  "message": zod.string()
});
var SendQuotationSmsParams = zod.object({
  "id": zod.coerce.number()
});
var SendQuotationSmsBody = zod.object({
  "phone": zod.string(),
  "message": zod.string()
});
var SendQuotationSmsResponse = zod.object({
  "message": zod.string()
});
var GetDashboardSummaryResponse = zod.object({
  "totalQuotations": zod.number(),
  "totalClients": zod.number(),
  "totalProducts": zod.number(),
  "pipelineValue": zod.number(),
  "approvedValue": zod.number(),
  "conversionRate": zod.number(),
  "thisMonthQuotations": zod.number(),
  "thisMonthValue": zod.number(),
  "draftCount": zod.number().optional(),
  "sentCount": zod.number().optional(),
  "approvedCount": zod.number().optional(),
  "rejectedCount": zod.number().optional(),
  "expiredCount": zod.number().optional(),
  "recentQuotations": zod.array(zod.object({
    "id": zod.number(),
    "quotationNumber": zod.string(),
    "clientId": zod.number().nullish(),
    "clientName": zod.string().nullish(),
    "clientCompany": zod.string().nullish(),
    "createdByName": zod.string().nullish(),
    "status": zod.enum(["draft", "sent", "approved", "rejected", "expired"]),
    "validUntil": zod.string().nullish(),
    "subtotal": zod.number(),
    "discountAmount": zod.number(),
    "discountPercent": zod.number().optional(),
    "taxAmount": zod.number(),
    "taxPercent": zod.number().optional(),
    "total": zod.number(),
    "notes": zod.string().nullish(),
    "terms": zod.string().nullish(),
    "itemCount": zod.number().optional(),
    "createdAt": zod.string(),
    "updatedAt": zod.string()
  }))
});
var GetMonthlyReportResponseItem = zod.object({
  "month": zod.number(),
  "year": zod.number(),
  "label": zod.string().optional(),
  "quotationCount": zod.number(),
  "totalValue": zod.number(),
  "approvedValue": zod.number(),
  "approvedCount": zod.number()
});
var GetMonthlyReportResponse = zod.array(GetMonthlyReportResponseItem);
var GetTopProductsResponseItem = zod.object({
  "productId": zod.number(),
  "productName": zod.string(),
  "count": zod.number(),
  "totalRevenue": zod.number()
});
var GetTopProductsResponse = zod.array(GetTopProductsResponseItem);
var GetPipelineResponseItem = zod.object({
  "status": zod.string(),
  "count": zod.number(),
  "totalValue": zod.number()
});
var GetPipelineResponse = zod.array(GetPipelineResponseItem);
var ListAuditLogsQueryParams = zod.object({
  "limit": zod.coerce.number().optional(),
  "offset": zod.coerce.number().optional()
});
var ListAuditLogsResponseItem = zod.object({
  "id": zod.number(),
  "userId": zod.number().nullish(),
  "userName": zod.string().nullish(),
  "action": zod.string(),
  "entity": zod.string(),
  "entityId": zod.number().nullish(),
  "details": zod.string().nullish(),
  "ipAddress": zod.string().nullish(),
  "createdAt": zod.string()
});
var ListAuditLogsResponse = zod.array(ListAuditLogsResponseItem);
var ListLeadsQueryParams = zod.object({
  "status": zod.coerce.string().optional(),
  "priority": zod.coerce.string().optional(),
  "source": zod.coerce.string().optional(),
  "search": zod.coerce.string().optional()
});
var ListLeadsResponseItem = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "email": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "company": zod.string().nullish(),
  "city": zod.string().nullish(),
  "state": zod.string().nullish(),
  "source": zod.string(),
  "externalId": zod.string().nullish(),
  "status": zod.string(),
  "priority": zod.string(),
  "score": zod.number(),
  "budget": zod.number().nullish(),
  "product": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "nextAction": zod.string().nullish(),
  "assignedToId": zod.number().nullish(),
  "convertedClientId": zod.number().nullish(),
  "lastContactedAt": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var ListLeadsResponse = zod.array(ListLeadsResponseItem);
var CreateLeadBody = zod.object({
  "name": zod.string(),
  "email": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "company": zod.string().nullish(),
  "city": zod.string().nullish(),
  "state": zod.string().nullish(),
  "source": zod.enum(["manual", "indiamart", "website", "other"]).optional(),
  "status": zod.enum(["new", "contacted", "qualified", "won", "lost"]).optional(),
  "priority": zod.enum(["hot", "warm", "cold"]).optional(),
  "budget": zod.number().nullish(),
  "product": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "nextAction": zod.string().nullish(),
  "assignedToId": zod.number().nullish()
});
var GetLeadParams = zod.object({
  "id": zod.coerce.number()
});
var GetLeadResponse = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "email": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "company": zod.string().nullish(),
  "city": zod.string().nullish(),
  "state": zod.string().nullish(),
  "source": zod.string(),
  "externalId": zod.string().nullish(),
  "status": zod.string(),
  "priority": zod.string(),
  "score": zod.number(),
  "budget": zod.number().nullish(),
  "product": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "nextAction": zod.string().nullish(),
  "assignedToId": zod.number().nullish(),
  "convertedClientId": zod.number().nullish(),
  "lastContactedAt": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
}).and(zod.object({
  "activities": zod.array(zod.object({
    "id": zod.number(),
    "leadId": zod.number(),
    "type": zod.string(),
    "title": zod.string(),
    "body": zod.string().nullish(),
    "userId": zod.number().nullish(),
    "userName": zod.string().nullish(),
    "createdAt": zod.string()
  })).optional()
}));
var UpdateLeadParams = zod.object({
  "id": zod.coerce.number()
});
var UpdateLeadBody = zod.object({
  "name": zod.string(),
  "email": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "company": zod.string().nullish(),
  "city": zod.string().nullish(),
  "state": zod.string().nullish(),
  "source": zod.enum(["manual", "indiamart", "website", "other"]).optional(),
  "status": zod.enum(["new", "contacted", "qualified", "won", "lost"]).optional(),
  "priority": zod.enum(["hot", "warm", "cold"]).optional(),
  "budget": zod.number().nullish(),
  "product": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "nextAction": zod.string().nullish(),
  "assignedToId": zod.number().nullish()
});
var UpdateLeadResponse = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "email": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "company": zod.string().nullish(),
  "city": zod.string().nullish(),
  "state": zod.string().nullish(),
  "source": zod.string(),
  "externalId": zod.string().nullish(),
  "status": zod.string(),
  "priority": zod.string(),
  "score": zod.number(),
  "budget": zod.number().nullish(),
  "product": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "nextAction": zod.string().nullish(),
  "assignedToId": zod.number().nullish(),
  "convertedClientId": zod.number().nullish(),
  "lastContactedAt": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var DeleteLeadParams = zod.object({
  "id": zod.coerce.number()
});
var DeleteLeadResponse = zod.object({
  "message": zod.string()
});
var ListLeadActivitiesParams = zod.object({
  "id": zod.coerce.number()
});
var ListLeadActivitiesResponseItem = zod.object({
  "id": zod.number(),
  "leadId": zod.number(),
  "type": zod.string(),
  "title": zod.string(),
  "body": zod.string().nullish(),
  "userId": zod.number().nullish(),
  "userName": zod.string().nullish(),
  "createdAt": zod.string()
});
var ListLeadActivitiesResponse = zod.array(ListLeadActivitiesResponseItem);
var CreateLeadActivityParams = zod.object({
  "id": zod.coerce.number()
});
var CreateLeadActivityBody = zod.object({
  "type": zod.enum(["note", "call", "email", "status_change", "task", "conversion"]),
  "title": zod.string(),
  "body": zod.string().nullish()
});
var ScoreLeadParams = zod.object({
  "id": zod.coerce.number()
});
var ScoreLeadResponse = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "email": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "company": zod.string().nullish(),
  "city": zod.string().nullish(),
  "state": zod.string().nullish(),
  "source": zod.string(),
  "externalId": zod.string().nullish(),
  "status": zod.string(),
  "priority": zod.string(),
  "score": zod.number(),
  "budget": zod.number().nullish(),
  "product": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "nextAction": zod.string().nullish(),
  "assignedToId": zod.number().nullish(),
  "convertedClientId": zod.number().nullish(),
  "lastContactedAt": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var ConvertLeadParams = zod.object({
  "id": zod.coerce.number()
});
var convertLeadBodyCreateQuotationDefault = false;
var ConvertLeadBody = zod.object({
  "createQuotation": zod.boolean().default(convertLeadBodyCreateQuotationDefault)
});
var ConvertLeadResponse = zod.object({
  "clientId": zod.number(),
  "quotationId": zod.number().nullish()
});
var ListTasksQueryParams = zod.object({
  "status": zod.coerce.string().optional(),
  "dueWithinDays": zod.coerce.number().optional()
});
var ListTasksResponseItem = zod.object({
  "id": zod.number(),
  "title": zod.string(),
  "description": zod.string().nullish(),
  "status": zod.string(),
  "priority": zod.string(),
  "dueAt": zod.string().nullish(),
  "relatedType": zod.string().optional(),
  "relatedId": zod.number().nullish(),
  "assignedToId": zod.number().nullish(),
  "assignedToName": zod.string().nullish(),
  "completedAt": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var ListTasksResponse = zod.array(ListTasksResponseItem);
var CreateTaskBody = zod.object({
  "title": zod.string(),
  "description": zod.string().nullish(),
  "status": zod.enum(["open", "done", "cancelled"]).optional(),
  "priority": zod.enum(["low", "medium", "high"]).optional(),
  "dueAt": zod.string().nullish(),
  "relatedType": zod.enum(["lead", "client", "quotation", "invoice", "none"]).optional(),
  "relatedId": zod.number().nullish(),
  "assignedToId": zod.number().nullish()
});
var UpdateTaskParams = zod.object({
  "id": zod.coerce.number()
});
var UpdateTaskBody = zod.object({
  "title": zod.string(),
  "description": zod.string().nullish(),
  "status": zod.enum(["open", "done", "cancelled"]).optional(),
  "priority": zod.enum(["low", "medium", "high"]).optional(),
  "dueAt": zod.string().nullish(),
  "relatedType": zod.enum(["lead", "client", "quotation", "invoice", "none"]).optional(),
  "relatedId": zod.number().nullish(),
  "assignedToId": zod.number().nullish()
});
var UpdateTaskResponse = zod.object({
  "id": zod.number(),
  "title": zod.string(),
  "description": zod.string().nullish(),
  "status": zod.string(),
  "priority": zod.string(),
  "dueAt": zod.string().nullish(),
  "relatedType": zod.string().optional(),
  "relatedId": zod.number().nullish(),
  "assignedToId": zod.number().nullish(),
  "assignedToName": zod.string().nullish(),
  "completedAt": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var DeleteTaskParams = zod.object({
  "id": zod.coerce.number()
});
var DeleteTaskResponse = zod.object({
  "message": zod.string()
});
var ListCallsQueryParams = zod.object({
  "leadId": zod.coerce.number().optional()
});
var ListCallsResponseItem = zod.object({
  "id": zod.number(),
  "leadId": zod.number().nullish(),
  "leadName": zod.string().nullish(),
  "userId": zod.number().nullish(),
  "userName": zod.string().nullish(),
  "direction": zod.string(),
  "fromNumber": zod.string().nullish(),
  "toNumber": zod.string(),
  "status": zod.string(),
  "twilioSid": zod.string().nullish(),
  "durationSec": zod.number().nullish(),
  "recordingUrl": zod.string().nullish(),
  "transcript": zod.string().nullish(),
  "aiSummary": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "startedAt": zod.string().nullish(),
  "endedAt": zod.string().nullish(),
  "createdAt": zod.string()
});
var ListCallsResponse = zod.array(ListCallsResponseItem);
var InitiateCallBody = zod.object({
  "toNumber": zod.string(),
  "agentNumber": zod.string(),
  "leadId": zod.number().nullish()
});
var UpdateCallParams = zod.object({
  "id": zod.coerce.number()
});
var UpdateCallBody = zod.object({
  "notes": zod.string().nullish(),
  "transcript": zod.string().nullish(),
  "durationSec": zod.number().nullish(),
  "status": zod.string().nullish()
});
var UpdateCallResponse = zod.object({
  "id": zod.number(),
  "leadId": zod.number().nullish(),
  "leadName": zod.string().nullish(),
  "userId": zod.number().nullish(),
  "userName": zod.string().nullish(),
  "direction": zod.string(),
  "fromNumber": zod.string().nullish(),
  "toNumber": zod.string(),
  "status": zod.string(),
  "twilioSid": zod.string().nullish(),
  "durationSec": zod.number().nullish(),
  "recordingUrl": zod.string().nullish(),
  "transcript": zod.string().nullish(),
  "aiSummary": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "startedAt": zod.string().nullish(),
  "endedAt": zod.string().nullish(),
  "createdAt": zod.string()
});
var SummarizeCallParams = zod.object({
  "id": zod.coerce.number()
});
var SummarizeCallResponse = zod.object({
  "id": zod.number(),
  "leadId": zod.number().nullish(),
  "leadName": zod.string().nullish(),
  "userId": zod.number().nullish(),
  "userName": zod.string().nullish(),
  "direction": zod.string(),
  "fromNumber": zod.string().nullish(),
  "toNumber": zod.string(),
  "status": zod.string(),
  "twilioSid": zod.string().nullish(),
  "durationSec": zod.number().nullish(),
  "recordingUrl": zod.string().nullish(),
  "transcript": zod.string().nullish(),
  "aiSummary": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "startedAt": zod.string().nullish(),
  "endedAt": zod.string().nullish(),
  "createdAt": zod.string()
});
var ListEmailsQueryParams = zod.object({
  "leadId": zod.coerce.number().optional(),
  "clientId": zod.coerce.number().optional()
});
var ListEmailsResponseItem = zod.object({
  "id": zod.number(),
  "leadId": zod.number().nullish(),
  "clientId": zod.number().nullish(),
  "direction": zod.string().optional(),
  "fromEmail": zod.string(),
  "toEmail": zod.string(),
  "subject": zod.string(),
  "body": zod.string().optional(),
  "status": zod.string(),
  "threadId": zod.string().nullish(),
  "openedAt": zod.string().nullish(),
  "clickedAt": zod.string().nullish(),
  "sentAt": zod.string().nullish(),
  "createdAt": zod.string()
});
var ListEmailsResponse = zod.array(ListEmailsResponseItem);
var SendEmailBody = zod.object({
  "toEmail": zod.string(),
  "subject": zod.string(),
  "body": zod.string(),
  "leadId": zod.number().nullish(),
  "clientId": zod.number().nullish(),
  "threadId": zod.string().nullish()
});
var draftEmailBodyToneDefault = `friendly`;
var DraftEmailBody = zod.object({
  "purpose": zod.string().describe("Short prompt describing what to write"),
  "leadId": zod.number().nullish(),
  "clientId": zod.number().nullish(),
  "tone": zod.enum(["friendly", "formal", "persuasive", "follow_up"]).default(draftEmailBodyToneDefault)
});
var DraftEmailResponse = zod.object({
  "subject": zod.string(),
  "body": zod.string()
});
var TrackEmailOpenParams = zod.object({
  "id": zod.coerce.number()
});
var ListCampaignsResponseItem = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "subject": zod.string(),
  "body": zod.string().optional(),
  "fromEmail": zod.string().optional(),
  "segment": zod.object({
    "entity": zod.string().optional(),
    "filters": zod.record(zod.string(), zod.string()).optional()
  }).optional(),
  "status": zod.string(),
  "scheduledAt": zod.string().nullish(),
  "sentAt": zod.string().nullish(),
  "stats": zod.object({
    "total": zod.number().optional(),
    "sent": zod.number().optional(),
    "opened": zod.number().optional(),
    "clicked": zod.number().optional()
  }).optional(),
  "subjectB": zod.string().nullish(),
  "bodyB": zod.string().nullish(),
  "abEnabled": zod.boolean().optional(),
  "abSplitPercent": zod.number().optional(),
  "winnerVariant": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var ListCampaignsResponse = zod.array(ListCampaignsResponseItem);
var CreateCampaignBody = zod.object({
  "name": zod.string(),
  "subject": zod.string(),
  "body": zod.string(),
  "fromEmail": zod.string(),
  "segment": zod.object({
    "entity": zod.enum(["leads", "clients"]),
    "filters": zod.record(zod.string(), zod.string()).optional()
  }),
  "scheduledAt": zod.string().nullish(),
  "subjectB": zod.string().nullish(),
  "bodyB": zod.string().nullish(),
  "abEnabled": zod.boolean().optional(),
  "abSplitPercent": zod.number().optional()
});
var GetCampaignParams = zod.object({
  "id": zod.coerce.number()
});
var GetCampaignResponse = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "subject": zod.string(),
  "body": zod.string().optional(),
  "fromEmail": zod.string().optional(),
  "segment": zod.object({
    "entity": zod.string().optional(),
    "filters": zod.record(zod.string(), zod.string()).optional()
  }).optional(),
  "status": zod.string(),
  "scheduledAt": zod.string().nullish(),
  "sentAt": zod.string().nullish(),
  "stats": zod.object({
    "total": zod.number().optional(),
    "sent": zod.number().optional(),
    "opened": zod.number().optional(),
    "clicked": zod.number().optional()
  }).optional(),
  "subjectB": zod.string().nullish(),
  "bodyB": zod.string().nullish(),
  "abEnabled": zod.boolean().optional(),
  "abSplitPercent": zod.number().optional(),
  "winnerVariant": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
}).and(zod.object({
  "recipients": zod.array(zod.object({
    "id": zod.number(),
    "email": zod.string(),
    "name": zod.string().nullish(),
    "leadId": zod.number().nullish(),
    "clientId": zod.number().nullish(),
    "status": zod.string(),
    "sentAt": zod.string().nullish(),
    "openedAt": zod.string().nullish(),
    "clickedAt": zod.string().nullish()
  })).optional()
}));
var UpdateCampaignParams = zod.object({
  "id": zod.coerce.number()
});
var UpdateCampaignBody = zod.object({
  "name": zod.string(),
  "subject": zod.string(),
  "body": zod.string(),
  "fromEmail": zod.string(),
  "segment": zod.object({
    "entity": zod.enum(["leads", "clients"]),
    "filters": zod.record(zod.string(), zod.string()).optional()
  }),
  "scheduledAt": zod.string().nullish(),
  "subjectB": zod.string().nullish(),
  "bodyB": zod.string().nullish(),
  "abEnabled": zod.boolean().optional(),
  "abSplitPercent": zod.number().optional()
});
var UpdateCampaignResponse = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "subject": zod.string(),
  "body": zod.string().optional(),
  "fromEmail": zod.string().optional(),
  "segment": zod.object({
    "entity": zod.string().optional(),
    "filters": zod.record(zod.string(), zod.string()).optional()
  }).optional(),
  "status": zod.string(),
  "scheduledAt": zod.string().nullish(),
  "sentAt": zod.string().nullish(),
  "stats": zod.object({
    "total": zod.number().optional(),
    "sent": zod.number().optional(),
    "opened": zod.number().optional(),
    "clicked": zod.number().optional()
  }).optional(),
  "subjectB": zod.string().nullish(),
  "bodyB": zod.string().nullish(),
  "abEnabled": zod.boolean().optional(),
  "abSplitPercent": zod.number().optional(),
  "winnerVariant": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var SendCampaignParams = zod.object({
  "id": zod.coerce.number()
});
var SendCampaignResponse = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "subject": zod.string(),
  "body": zod.string().optional(),
  "fromEmail": zod.string().optional(),
  "segment": zod.object({
    "entity": zod.string().optional(),
    "filters": zod.record(zod.string(), zod.string()).optional()
  }).optional(),
  "status": zod.string(),
  "scheduledAt": zod.string().nullish(),
  "sentAt": zod.string().nullish(),
  "stats": zod.object({
    "total": zod.number().optional(),
    "sent": zod.number().optional(),
    "opened": zod.number().optional(),
    "clicked": zod.number().optional()
  }).optional(),
  "subjectB": zod.string().nullish(),
  "bodyB": zod.string().nullish(),
  "abEnabled": zod.boolean().optional(),
  "abSplitPercent": zod.number().optional(),
  "winnerVariant": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var ListSalesOrdersResponseItem = zod.object({
  "id": zod.number(),
  "orderNumber": zod.string(),
  "clientId": zod.number().nullish(),
  "clientName": zod.string().nullish(),
  "quotationId": zod.number().nullish(),
  "warehouseId": zod.number().nullish(),
  "status": zod.string(),
  "subtotal": zod.number(),
  "discountAmount": zod.number().optional(),
  "taxAmount": zod.number().optional(),
  "total": zod.number(),
  "expectedDeliveryAt": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var ListSalesOrdersResponse = zod.array(ListSalesOrdersResponseItem);
var CreateSalesOrderBody = zod.object({
  "clientId": zod.number().nullish(),
  "warehouseId": zod.number().nullish(),
  "status": zod.enum(["draft", "confirmed", "in_production", "delivered", "cancelled"]).optional(),
  "expectedDeliveryAt": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "items": zod.array(zod.object({
    "itemId": zod.number().nullish(),
    "description": zod.string(),
    "quantity": zod.number(),
    "unitPrice": zod.number()
  })).optional()
});
var GetSalesOrderParams = zod.object({
  "id": zod.coerce.number()
});
var GetSalesOrderResponse = zod.object({
  "id": zod.number(),
  "orderNumber": zod.string(),
  "clientId": zod.number().nullish(),
  "clientName": zod.string().nullish(),
  "quotationId": zod.number().nullish(),
  "warehouseId": zod.number().nullish(),
  "status": zod.string(),
  "subtotal": zod.number(),
  "discountAmount": zod.number().optional(),
  "taxAmount": zod.number().optional(),
  "total": zod.number(),
  "expectedDeliveryAt": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
}).and(zod.object({
  "items": zod.array(zod.object({
    "id": zod.number(),
    "itemId": zod.number().nullish(),
    "description": zod.string(),
    "quantity": zod.number(),
    "unitPrice": zod.number(),
    "totalPrice": zod.number(),
    "availability": zod.array(zod.object({
      "warehouseId": zod.number(),
      "warehouseName": zod.string(),
      "isOrderWarehouse": zod.boolean(),
      "onHand": zod.number(),
      "reserved": zod.number(),
      "available": zod.number()
    })).optional()
  })).optional()
}));
var UpdateSalesOrderParams = zod.object({
  "id": zod.coerce.number()
});
var UpdateSalesOrderBody = zod.object({
  "clientId": zod.number().nullish(),
  "warehouseId": zod.number().nullish(),
  "status": zod.enum(["draft", "confirmed", "in_production", "delivered", "cancelled"]).optional(),
  "expectedDeliveryAt": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "items": zod.array(zod.object({
    "itemId": zod.number().nullish(),
    "description": zod.string(),
    "quantity": zod.number(),
    "unitPrice": zod.number()
  })).optional()
});
var UpdateSalesOrderResponse = zod.object({
  "id": zod.number(),
  "orderNumber": zod.string(),
  "clientId": zod.number().nullish(),
  "clientName": zod.string().nullish(),
  "quotationId": zod.number().nullish(),
  "warehouseId": zod.number().nullish(),
  "status": zod.string(),
  "subtotal": zod.number(),
  "discountAmount": zod.number().optional(),
  "taxAmount": zod.number().optional(),
  "total": zod.number(),
  "expectedDeliveryAt": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var PromoteQuotationToSalesOrderParams = zod.object({
  "quotationId": zod.coerce.number()
});
var ListInvoicesQueryParams = zod.object({
  "status": zod.coerce.string().optional()
});
var ListInvoicesResponseItem = zod.object({
  "id": zod.number(),
  "invoiceNumber": zod.string(),
  "clientId": zod.number().nullish(),
  "clientName": zod.string().nullish(),
  "salesOrderId": zod.number().nullish(),
  "status": zod.string(),
  "issueDate": zod.string().optional(),
  "dueDate": zod.string().nullish(),
  "sellerState": zod.string().nullish(),
  "buyerState": zod.string().nullish(),
  "subtotal": zod.number().optional(),
  "discountAmount": zod.number().optional(),
  "taxableAmount": zod.number().optional(),
  "cgst": zod.number().optional(),
  "sgst": zod.number().optional(),
  "igst": zod.number().optional(),
  "taxRate": zod.number().optional(),
  "total": zod.number(),
  "amountPaid": zod.number().optional(),
  "notes": zod.string().nullish(),
  "terms": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var ListInvoicesResponse = zod.array(ListInvoicesResponseItem);
var CreateInvoiceBody = zod.object({
  "clientId": zod.number().nullish(),
  "salesOrderId": zod.number().nullish(),
  "dueDate": zod.string().nullish(),
  "taxRate": zod.number().nullish(),
  "notes": zod.string().nullish(),
  "terms": zod.string().nullish(),
  "items": zod.array(zod.object({
    "description": zod.string(),
    "quantity": zod.number(),
    "unitPrice": zod.number()
  })).optional()
});
var GetInvoiceParams = zod.object({
  "id": zod.coerce.number()
});
var GetInvoiceResponse = zod.object({
  "id": zod.number(),
  "invoiceNumber": zod.string(),
  "clientId": zod.number().nullish(),
  "clientName": zod.string().nullish(),
  "salesOrderId": zod.number().nullish(),
  "status": zod.string(),
  "issueDate": zod.string().optional(),
  "dueDate": zod.string().nullish(),
  "sellerState": zod.string().nullish(),
  "buyerState": zod.string().nullish(),
  "subtotal": zod.number().optional(),
  "discountAmount": zod.number().optional(),
  "taxableAmount": zod.number().optional(),
  "cgst": zod.number().optional(),
  "sgst": zod.number().optional(),
  "igst": zod.number().optional(),
  "taxRate": zod.number().optional(),
  "total": zod.number(),
  "amountPaid": zod.number().optional(),
  "notes": zod.string().nullish(),
  "terms": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
}).and(zod.object({
  "items": zod.array(zod.object({
    "id": zod.number(),
    "description": zod.string(),
    "quantity": zod.number(),
    "unitPrice": zod.number(),
    "totalPrice": zod.number()
  })).optional(),
  "payments": zod.array(zod.object({
    "id": zod.number(),
    "invoiceId": zod.number(),
    "amount": zod.number(),
    "method": zod.string(),
    "reference": zod.string().nullish(),
    "paidAt": zod.string(),
    "notes": zod.string().nullish(),
    "recordedByName": zod.string().nullish(),
    "createdAt": zod.string()
  })).optional(),
  "client": zod.record(zod.string(), zod.unknown()).nullish()
}));
var UpdateInvoiceParams = zod.object({
  "id": zod.coerce.number()
});
var UpdateInvoiceBody = zod.object({
  "clientId": zod.number().nullish(),
  "salesOrderId": zod.number().nullish(),
  "dueDate": zod.string().nullish(),
  "taxRate": zod.number().nullish(),
  "notes": zod.string().nullish(),
  "terms": zod.string().nullish(),
  "items": zod.array(zod.object({
    "description": zod.string(),
    "quantity": zod.number(),
    "unitPrice": zod.number()
  })).optional()
});
var UpdateInvoiceResponse = zod.object({
  "id": zod.number(),
  "invoiceNumber": zod.string(),
  "clientId": zod.number().nullish(),
  "clientName": zod.string().nullish(),
  "salesOrderId": zod.number().nullish(),
  "status": zod.string(),
  "issueDate": zod.string().optional(),
  "dueDate": zod.string().nullish(),
  "sellerState": zod.string().nullish(),
  "buyerState": zod.string().nullish(),
  "subtotal": zod.number().optional(),
  "discountAmount": zod.number().optional(),
  "taxableAmount": zod.number().optional(),
  "cgst": zod.number().optional(),
  "sgst": zod.number().optional(),
  "igst": zod.number().optional(),
  "taxRate": zod.number().optional(),
  "total": zod.number(),
  "amountPaid": zod.number().optional(),
  "notes": zod.string().nullish(),
  "terms": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var SetInvoiceStatusParams = zod.object({
  "id": zod.coerce.number()
});
var SetInvoiceStatusBody = zod.object({
  "status": zod.string()
});
var SetInvoiceStatusResponse = zod.object({
  "id": zod.number(),
  "invoiceNumber": zod.string(),
  "clientId": zod.number().nullish(),
  "clientName": zod.string().nullish(),
  "salesOrderId": zod.number().nullish(),
  "status": zod.string(),
  "issueDate": zod.string().optional(),
  "dueDate": zod.string().nullish(),
  "sellerState": zod.string().nullish(),
  "buyerState": zod.string().nullish(),
  "subtotal": zod.number().optional(),
  "discountAmount": zod.number().optional(),
  "taxableAmount": zod.number().optional(),
  "cgst": zod.number().optional(),
  "sgst": zod.number().optional(),
  "igst": zod.number().optional(),
  "taxRate": zod.number().optional(),
  "total": zod.number(),
  "amountPaid": zod.number().optional(),
  "notes": zod.string().nullish(),
  "terms": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var PromoteSalesOrderToInvoiceParams = zod.object({
  "salesOrderId": zod.coerce.number()
});
var ListPaymentsQueryParams = zod.object({
  "invoiceId": zod.coerce.number().optional()
});
var ListPaymentsResponseItem = zod.object({
  "id": zod.number(),
  "invoiceId": zod.number(),
  "amount": zod.number(),
  "method": zod.string(),
  "reference": zod.string().nullish(),
  "paidAt": zod.string(),
  "notes": zod.string().nullish(),
  "recordedByName": zod.string().nullish(),
  "createdAt": zod.string()
});
var ListPaymentsResponse = zod.array(ListPaymentsResponseItem);
var CreatePaymentBody = zod.object({
  "invoiceId": zod.number(),
  "amount": zod.number(),
  "method": zod.enum(["cash", "upi", "bank_transfer", "cheque", "card", "other"]).optional(),
  "reference": zod.string().nullish(),
  "paidAt": zod.string().nullish(),
  "notes": zod.string().nullish()
});
var DeletePaymentParams = zod.object({
  "id": zod.coerce.number()
});
var DeletePaymentResponse = zod.object({
  "message": zod.string()
});
var ListIntegrationsResponseItem = zod.object({
  "id": zod.number(),
  "provider": zod.string(),
  "enabled": zod.boolean(),
  "config": zod.record(zod.string(), zod.string()),
  "lastSyncedAt": zod.string().nullish(),
  "lastSyncStatus": zod.string().nullish(),
  "lastSyncMessage": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var ListIntegrationsResponse = zod.array(ListIntegrationsResponseItem);
var UpsertIntegrationParams = zod.object({
  "provider": zod.coerce.string()
});
var UpsertIntegrationBody = zod.object({
  "enabled": zod.boolean(),
  "config": zod.record(zod.string(), zod.string())
});
var UpsertIntegrationResponse = zod.object({
  "id": zod.number(),
  "provider": zod.string(),
  "enabled": zod.boolean(),
  "config": zod.record(zod.string(), zod.string()),
  "lastSyncedAt": zod.string().nullish(),
  "lastSyncStatus": zod.string().nullish(),
  "lastSyncMessage": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var DeleteIntegrationParams = zod.object({
  "provider": zod.coerce.string()
});
var DeleteIntegrationResponse = zod.object({
  "message": zod.string()
});
var SyncIndiamartLeadsResponse = zod.object({
  "imported": zod.number(),
  "message": zod.string()
});
var SyncTradeindiaLeadsResponse = zod.object({
  "imported": zod.number(),
  "message": zod.string()
});
var SyncJustdialLeadsResponse = zod.object({
  "imported": zod.number(),
  "message": zod.string()
});
var SyncFbLeadAdsResponse = zod.object({
  "imported": zod.number(),
  "message": zod.string()
});
var RegisterPushTokenBody = zod.object({
  "token": zod.string(),
  "platform": zod.enum(["ios", "android", "web"]),
  "deviceName": zod.string().nullish()
});
var RegisterPushTokenResponse = zod.object({
  "id": zod.number(),
  "userId": zod.number().optional(),
  "token": zod.string().optional(),
  "platform": zod.enum(["ios", "android", "web"]),
  "deviceName": zod.string().nullish(),
  "createdAt": zod.coerce.date().optional(),
  "lastUsedAt": zod.coerce.date().optional()
});
var UnregisterPushTokenBody = zod.object({
  "token": zod.string()
});
var UnregisterPushTokenResponse = zod.object({
  "message": zod.string()
});
var ListPushTokensResponseItem = zod.object({
  "id": zod.number(),
  "userId": zod.number().optional(),
  "token": zod.string().optional(),
  "platform": zod.enum(["ios", "android", "web"]),
  "deviceName": zod.string().nullish(),
  "createdAt": zod.coerce.date().optional(),
  "lastUsedAt": zod.coerce.date().optional()
});
var ListPushTokensResponse = zod.array(ListPushTokensResponseItem);
var SendTestPushBody = zod.object({
  "title": zod.string().optional(),
  "body": zod.string().optional()
});
var SendTestPushResponse = zod.object({
  "sent": zod.number(),
  "failed": zod.number()
});
var ListWhatsappMessagesQueryParams = zod.object({
  "leadId": zod.coerce.number().optional()
});
var ListWhatsappMessagesResponseItem = zod.object({
  "id": zod.number(),
  "leadId": zod.number().nullish(),
  "clientId": zod.number().nullish(),
  "direction": zod.enum(["inbound", "outbound"]),
  "phone": zod.string(),
  "body": zod.string().nullish(),
  "templateName": zod.string().nullish(),
  "templateLanguage": zod.string().nullish(),
  "templateVariables": zod.array(zod.string()).optional(),
  "status": zod.enum(["queued", "sent", "delivered", "read", "failed", "received"]),
  "providerMessageId": zod.string().nullish(),
  "errorMessage": zod.string().nullish(),
  "createdAt": zod.coerce.date()
});
var ListWhatsappMessagesResponse = zod.array(ListWhatsappMessagesResponseItem);
var SendWhatsappMessageBody = zod.object({
  "phone": zod.string(),
  "body": zod.string().optional(),
  "templateName": zod.string().optional(),
  "templateLanguage": zod.string().optional(),
  "templateVariables": zod.array(zod.string()).optional(),
  "leadId": zod.number().optional(),
  "clientId": zod.number().optional()
});
var SendWhatsappMessageResponse = zod.object({
  "id": zod.number(),
  "leadId": zod.number().nullish(),
  "clientId": zod.number().nullish(),
  "direction": zod.enum(["inbound", "outbound"]),
  "phone": zod.string(),
  "body": zod.string().nullish(),
  "templateName": zod.string().nullish(),
  "templateLanguage": zod.string().nullish(),
  "templateVariables": zod.array(zod.string()).optional(),
  "status": zod.enum(["queued", "sent", "delivered", "read", "failed", "received"]),
  "providerMessageId": zod.string().nullish(),
  "errorMessage": zod.string().nullish(),
  "createdAt": zod.coerce.date()
});
var GetDashboardWidgetsResponse = zod.object({
  "newLeadsToday": zod.number(),
  "hotLeads": zod.number(),
  "callsThisWeek": zod.number(),
  "emailsSentThisWeek": zod.number(),
  "quotationsSentThisWeek": zod.number(),
  "invoicesUnpaid": zod.number(),
  "revenueThisMonth": zod.number(),
  "overdueAmount": zod.number(),
  "openTasks": zod.number(),
  "lowStockItems": zod.number().optional(),
  "openPurchaseOrders": zod.number().optional(),
  "stockValue": zod.number().optional()
});
var ListItemsResponseItem = zod.object({
  "id": zod.number(),
  "sku": zod.string(),
  "name": zod.string(),
  "category": zod.string().nullish(),
  "description": zod.string().nullish(),
  "unit": zod.string(),
  "hsnCode": zod.string().nullish(),
  "gstRate": zod.number(),
  "salePrice": zod.number(),
  "purchasePrice": zod.number(),
  "avgCost": zod.number(),
  "openingStock": zod.number().optional(),
  "lowStockThreshold": zod.number().optional(),
  "currentStock": zod.number().optional(),
  "isActive": zod.boolean(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var ListItemsResponse = zod.array(ListItemsResponseItem);
var CreateItemBody = zod.object({
  "sku": zod.string(),
  "name": zod.string(),
  "category": zod.string().nullish(),
  "description": zod.string().nullish(),
  "unit": zod.string(),
  "hsnCode": zod.string().nullish(),
  "gstRate": zod.number().nullish(),
  "salePrice": zod.number().nullish(),
  "purchasePrice": zod.number().nullish(),
  "openingStock": zod.number().nullish(),
  "lowStockThreshold": zod.number().nullish(),
  "isActive": zod.boolean().nullish()
});
var GetItemParams = zod.object({
  "id": zod.coerce.number()
});
var GetItemResponse = zod.object({
  "id": zod.number(),
  "sku": zod.string(),
  "name": zod.string(),
  "category": zod.string().nullish(),
  "description": zod.string().nullish(),
  "unit": zod.string(),
  "hsnCode": zod.string().nullish(),
  "gstRate": zod.number(),
  "salePrice": zod.number(),
  "purchasePrice": zod.number(),
  "avgCost": zod.number(),
  "openingStock": zod.number().optional(),
  "lowStockThreshold": zod.number().optional(),
  "currentStock": zod.number().optional(),
  "isActive": zod.boolean(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var UpdateItemParams = zod.object({
  "id": zod.coerce.number()
});
var UpdateItemBody = zod.object({
  "sku": zod.string(),
  "name": zod.string(),
  "category": zod.string().nullish(),
  "description": zod.string().nullish(),
  "unit": zod.string(),
  "hsnCode": zod.string().nullish(),
  "gstRate": zod.number().nullish(),
  "salePrice": zod.number().nullish(),
  "purchasePrice": zod.number().nullish(),
  "openingStock": zod.number().nullish(),
  "lowStockThreshold": zod.number().nullish(),
  "isActive": zod.boolean().nullish()
});
var UpdateItemResponse = zod.object({
  "id": zod.number(),
  "sku": zod.string(),
  "name": zod.string(),
  "category": zod.string().nullish(),
  "description": zod.string().nullish(),
  "unit": zod.string(),
  "hsnCode": zod.string().nullish(),
  "gstRate": zod.number(),
  "salePrice": zod.number(),
  "purchasePrice": zod.number(),
  "avgCost": zod.number(),
  "openingStock": zod.number().optional(),
  "lowStockThreshold": zod.number().optional(),
  "currentStock": zod.number().optional(),
  "isActive": zod.boolean(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var DeleteItemParams = zod.object({
  "id": zod.coerce.number()
});
var DeleteItemResponse = zod.object({
  "message": zod.string()
});
var ListWarehousesResponseItem = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "code": zod.string().nullish(),
  "address": zod.string().nullish(),
  "city": zod.string().nullish(),
  "state": zod.string().nullish(),
  "isDefault": zod.boolean(),
  "isActive": zod.boolean(),
  "createdAt": zod.string()
});
var ListWarehousesResponse = zod.array(ListWarehousesResponseItem);
var CreateWarehouseBody = zod.object({
  "name": zod.string(),
  "code": zod.string().nullish(),
  "address": zod.string().nullish(),
  "city": zod.string().nullish(),
  "state": zod.string().nullish(),
  "isDefault": zod.boolean().nullish(),
  "isActive": zod.boolean().nullish()
});
var UpdateWarehouseParams = zod.object({
  "id": zod.coerce.number()
});
var UpdateWarehouseBody = zod.object({
  "name": zod.string(),
  "code": zod.string().nullish(),
  "address": zod.string().nullish(),
  "city": zod.string().nullish(),
  "state": zod.string().nullish(),
  "isDefault": zod.boolean().nullish(),
  "isActive": zod.boolean().nullish()
});
var UpdateWarehouseResponse = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "code": zod.string().nullish(),
  "address": zod.string().nullish(),
  "city": zod.string().nullish(),
  "state": zod.string().nullish(),
  "isDefault": zod.boolean(),
  "isActive": zod.boolean(),
  "createdAt": zod.string()
});
var DeleteWarehouseParams = zod.object({
  "id": zod.coerce.number()
});
var DeleteWarehouseResponse = zod.object({
  "message": zod.string()
});
var ListVendorsResponseItem = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "contactName": zod.string().nullish(),
  "email": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "address": zod.string().nullish(),
  "city": zod.string().nullish(),
  "state": zod.string().nullish(),
  "gstNumber": zod.string().nullish(),
  "paymentTermsDays": zod.number(),
  "notes": zod.string().nullish(),
  "createdAt": zod.string()
});
var ListVendorsResponse = zod.array(ListVendorsResponseItem);
var CreateVendorBody = zod.object({
  "name": zod.string(),
  "contactName": zod.string().nullish(),
  "email": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "address": zod.string().nullish(),
  "city": zod.string().nullish(),
  "state": zod.string().nullish(),
  "gstNumber": zod.string().nullish(),
  "paymentTermsDays": zod.number().nullish(),
  "notes": zod.string().nullish()
});
var GetVendorParams = zod.object({
  "id": zod.coerce.number()
});
var GetVendorResponse = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "contactName": zod.string().nullish(),
  "email": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "address": zod.string().nullish(),
  "city": zod.string().nullish(),
  "state": zod.string().nullish(),
  "gstNumber": zod.string().nullish(),
  "paymentTermsDays": zod.number(),
  "notes": zod.string().nullish(),
  "createdAt": zod.string()
});
var UpdateVendorParams = zod.object({
  "id": zod.coerce.number()
});
var UpdateVendorBody = zod.object({
  "name": zod.string(),
  "contactName": zod.string().nullish(),
  "email": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "address": zod.string().nullish(),
  "city": zod.string().nullish(),
  "state": zod.string().nullish(),
  "gstNumber": zod.string().nullish(),
  "paymentTermsDays": zod.number().nullish(),
  "notes": zod.string().nullish()
});
var UpdateVendorResponse = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "contactName": zod.string().nullish(),
  "email": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "address": zod.string().nullish(),
  "city": zod.string().nullish(),
  "state": zod.string().nullish(),
  "gstNumber": zod.string().nullish(),
  "paymentTermsDays": zod.number(),
  "notes": zod.string().nullish(),
  "createdAt": zod.string()
});
var DeleteVendorParams = zod.object({
  "id": zod.coerce.number()
});
var DeleteVendorResponse = zod.object({
  "message": zod.string()
});
var ListPurchaseOrdersResponseItem = zod.object({
  "id": zod.number(),
  "poNumber": zod.string(),
  "vendorId": zod.number().nullish(),
  "vendorName": zod.string().nullish(),
  "warehouseId": zod.number().nullish(),
  "status": zod.string(),
  "expectedDate": zod.string().nullish(),
  "subtotal": zod.number(),
  "taxAmount": zod.number().optional(),
  "total": zod.number(),
  "notes": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var ListPurchaseOrdersResponse = zod.array(ListPurchaseOrdersResponseItem);
var CreatePurchaseOrderBody = zod.object({
  "vendorId": zod.number().nullish(),
  "warehouseId": zod.number().nullish(),
  "status": zod.enum(["draft", "sent", "partial", "received", "cancelled"]).optional(),
  "expectedDate": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "taxRate": zod.number().nullish(),
  "items": zod.array(zod.object({
    "itemId": zod.number().nullish(),
    "description": zod.string(),
    "quantity": zod.number(),
    "unitPrice": zod.number()
  })).optional()
});
var GetPurchaseOrderParams = zod.object({
  "id": zod.coerce.number()
});
var GetPurchaseOrderResponse = zod.object({
  "id": zod.number(),
  "poNumber": zod.string(),
  "vendorId": zod.number().nullish(),
  "vendorName": zod.string().nullish(),
  "warehouseId": zod.number().nullish(),
  "status": zod.string(),
  "expectedDate": zod.string().nullish(),
  "subtotal": zod.number(),
  "taxAmount": zod.number().optional(),
  "total": zod.number(),
  "notes": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
}).and(zod.object({
  "items": zod.array(zod.object({
    "id": zod.number(),
    "itemId": zod.number().nullish(),
    "itemName": zod.string().nullish(),
    "itemSku": zod.string().nullish(),
    "description": zod.string(),
    "quantity": zod.number(),
    "receivedQuantity": zod.number(),
    "unitPrice": zod.number(),
    "totalPrice": zod.number()
  })).optional()
}));
var UpdatePurchaseOrderParams = zod.object({
  "id": zod.coerce.number()
});
var UpdatePurchaseOrderBody = zod.object({
  "vendorId": zod.number().nullish(),
  "warehouseId": zod.number().nullish(),
  "status": zod.enum(["draft", "sent", "partial", "received", "cancelled"]).optional(),
  "expectedDate": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "taxRate": zod.number().nullish(),
  "items": zod.array(zod.object({
    "itemId": zod.number().nullish(),
    "description": zod.string(),
    "quantity": zod.number(),
    "unitPrice": zod.number()
  })).optional()
});
var UpdatePurchaseOrderResponse = zod.object({
  "id": zod.number(),
  "poNumber": zod.string(),
  "vendorId": zod.number().nullish(),
  "vendorName": zod.string().nullish(),
  "warehouseId": zod.number().nullish(),
  "status": zod.string(),
  "expectedDate": zod.string().nullish(),
  "subtotal": zod.number(),
  "taxAmount": zod.number().optional(),
  "total": zod.number(),
  "notes": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var ListGrnQueryParams = zod.object({
  "purchaseOrderId": zod.coerce.number().optional()
});
var ListGrnResponseItem = zod.object({
  "id": zod.number(),
  "grnNumber": zod.string(),
  "purchaseOrderId": zod.number().nullish(),
  "poNumber": zod.string().nullish(),
  "warehouseId": zod.number(),
  "warehouseName": zod.string().nullish(),
  "receivedAt": zod.string(),
  "notes": zod.string().nullish(),
  "items": zod.array(zod.object({
    "id": zod.number(),
    "poItemId": zod.number().nullish(),
    "itemId": zod.number(),
    "itemName": zod.string().nullish(),
    "itemSku": zod.string().nullish(),
    "quantity": zod.number(),
    "unitCost": zod.number()
  })).optional(),
  "createdAt": zod.string()
});
var ListGrnResponse = zod.array(ListGrnResponseItem);
var CreateGrnBody = zod.object({
  "purchaseOrderId": zod.number().nullish(),
  "warehouseId": zod.number(),
  "receivedAt": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "items": zod.array(zod.object({
    "poItemId": zod.number().nullish(),
    "itemId": zod.number(),
    "quantity": zod.number(),
    "unitCost": zod.number()
  }))
});
var ListVendorBillsResponseItem = zod.object({
  "id": zod.number(),
  "billNumber": zod.string(),
  "vendorId": zod.number().nullish(),
  "vendorName": zod.string().nullish(),
  "purchaseOrderId": zod.number().nullish(),
  "status": zod.string(),
  "issueDate": zod.string().optional(),
  "dueDate": zod.string().nullish(),
  "subtotal": zod.number(),
  "taxAmount": zod.number().optional(),
  "total": zod.number(),
  "amountPaid": zod.number(),
  "notes": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var ListVendorBillsResponse = zod.array(ListVendorBillsResponseItem);
var CreateVendorBillBody = zod.object({
  "billNumber": zod.string().nullish(),
  "vendorId": zod.number().nullish(),
  "purchaseOrderId": zod.number().nullish(),
  "status": zod.enum(["draft", "open", "partial", "paid", "overdue", "cancelled"]).optional(),
  "issueDate": zod.string().nullish(),
  "dueDate": zod.string().nullish(),
  "taxRate": zod.number().nullish(),
  "amountPaid": zod.number().nullish(),
  "notes": zod.string().nullish(),
  "items": zod.array(zod.object({
    "itemId": zod.number().nullish(),
    "description": zod.string(),
    "quantity": zod.number(),
    "unitPrice": zod.number()
  })).optional()
});
var GetVendorBillParams = zod.object({
  "id": zod.coerce.number()
});
var GetVendorBillResponse = zod.object({
  "id": zod.number(),
  "billNumber": zod.string(),
  "vendorId": zod.number().nullish(),
  "vendorName": zod.string().nullish(),
  "purchaseOrderId": zod.number().nullish(),
  "status": zod.string(),
  "issueDate": zod.string().optional(),
  "dueDate": zod.string().nullish(),
  "subtotal": zod.number(),
  "taxAmount": zod.number().optional(),
  "total": zod.number(),
  "amountPaid": zod.number(),
  "notes": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
}).and(zod.object({
  "items": zod.array(zod.object({
    "id": zod.number(),
    "itemId": zod.number().nullish(),
    "description": zod.string(),
    "quantity": zod.number(),
    "unitPrice": zod.number(),
    "totalPrice": zod.number()
  })).optional()
}));
var UpdateVendorBillParams = zod.object({
  "id": zod.coerce.number()
});
var UpdateVendorBillBody = zod.object({
  "billNumber": zod.string().nullish(),
  "vendorId": zod.number().nullish(),
  "purchaseOrderId": zod.number().nullish(),
  "status": zod.enum(["draft", "open", "partial", "paid", "overdue", "cancelled"]).optional(),
  "issueDate": zod.string().nullish(),
  "dueDate": zod.string().nullish(),
  "taxRate": zod.number().nullish(),
  "amountPaid": zod.number().nullish(),
  "notes": zod.string().nullish(),
  "items": zod.array(zod.object({
    "itemId": zod.number().nullish(),
    "description": zod.string(),
    "quantity": zod.number(),
    "unitPrice": zod.number()
  })).optional()
});
var UpdateVendorBillResponse = zod.object({
  "id": zod.number(),
  "billNumber": zod.string(),
  "vendorId": zod.number().nullish(),
  "vendorName": zod.string().nullish(),
  "purchaseOrderId": zod.number().nullish(),
  "status": zod.string(),
  "issueDate": zod.string().optional(),
  "dueDate": zod.string().nullish(),
  "subtotal": zod.number(),
  "taxAmount": zod.number().optional(),
  "total": zod.number(),
  "amountPaid": zod.number(),
  "notes": zod.string().nullish(),
  "createdAt": zod.string(),
  "updatedAt": zod.string().optional()
});
var GetStockLevelsQueryParams = zod.object({
  "warehouseId": zod.coerce.number().optional(),
  "itemId": zod.coerce.number().optional()
});
var GetStockLevelsResponseItem = zod.object({
  "itemId": zod.number(),
  "itemSku": zod.string().nullish(),
  "itemName": zod.string(),
  "unit": zod.string().nullish(),
  "warehouseId": zod.number(),
  "warehouseName": zod.string(),
  "quantity": zod.number(),
  "avgCost": zod.number().optional(),
  "value": zod.number().optional()
});
var GetStockLevelsResponse = zod.array(GetStockLevelsResponseItem);
var ListStockMovementsQueryParams = zod.object({
  "itemId": zod.coerce.number().optional(),
  "warehouseId": zod.coerce.number().optional()
});
var ListStockMovementsResponseItem = zod.object({
  "id": zod.number(),
  "itemId": zod.number(),
  "itemName": zod.string().nullish(),
  "itemSku": zod.string().nullish(),
  "warehouseId": zod.number(),
  "warehouseName": zod.string().nullish(),
  "direction": zod.string(),
  "quantity": zod.number(),
  "unitCost": zod.number().optional(),
  "reason": zod.string(),
  "referenceType": zod.string().nullish(),
  "referenceId": zod.number().nullish(),
  "notes": zod.string().nullish(),
  "createdAt": zod.string()
});
var ListStockMovementsResponse = zod.array(ListStockMovementsResponseItem);
var CreateStockMovementBody = zod.object({
  "itemId": zod.number(),
  "warehouseId": zod.number(),
  "direction": zod.enum(["in", "out"]),
  "quantity": zod.number(),
  "unitCost": zod.number().nullish(),
  "reason": zod.enum(["opening", "purchase", "sale", "adjustment", "transfer_in", "transfer_out", "return"]),
  "notes": zod.string().nullish(),
  "transferToWarehouseId": zod.number().nullish()
});
var GetStockValuationResponse = zod.object({
  "totalValue": zod.number(),
  "totalItems": zod.number(),
  "byWarehouse": zod.array(zod.object({
    "warehouseId": zod.number(),
    "warehouseName": zod.string(),
    "value": zod.number(),
    "items": zod.number()
  })),
  "byCategory": zod.array(zod.object({
    "category": zod.string(),
    "value": zod.number(),
    "items": zod.number()
  }))
});
var GetLowStockResponseItem = zod.object({
  "itemId": zod.number(),
  "itemSku": zod.string().nullish(),
  "itemName": zod.string(),
  "unit": zod.string().nullish(),
  "currentStock": zod.number(),
  "lowStockThreshold": zod.number()
});
var GetLowStockResponse = zod.array(GetLowStockResponseItem);
var ListSocialAccountsResponseItem = zod.object({
  "id": zod.number(),
  "platform": zod.enum(["facebook", "instagram", "linkedin"]),
  "externalId": zod.string(),
  "accountName": zod.string(),
  "status": zod.string(),
  "expiresAt": zod.string().nullish(),
  "metadata": zod.record(zod.string(), zod.unknown()).optional(),
  "createdAt": zod.string(),
  "updatedAt": zod.string()
});
var ListSocialAccountsResponse = zod.array(ListSocialAccountsResponseItem);
var ConnectSocialAccountBody = zod.object({
  "platform": zod.enum(["facebook", "instagram", "linkedin"]),
  "externalId": zod.string(),
  "accountName": zod.string(),
  "accessToken": zod.string(),
  "refreshToken": zod.string().optional(),
  "expiresAt": zod.string().optional(),
  "metadata": zod.record(zod.string(), zod.unknown()).optional()
});
var DisconnectSocialAccountParams = zod.object({
  "id": zod.coerce.number()
});
var DisconnectSocialAccountResponse = zod.object({
  "message": zod.string()
});
var ListSocialPostsResponseItem = zod.object({
  "id": zod.number(),
  "content": zod.string(),
  "mediaUrls": zod.array(zod.string()).optional(),
  "platforms": zod.array(zod.string()),
  "variants": zod.record(zod.string(), zod.string()).optional(),
  "status": zod.string(),
  "scheduledAt": zod.string().nullish(),
  "publishedAt": zod.string().nullish(),
  "context": zod.record(zod.string(), zod.unknown()).optional(),
  "createdAt": zod.string(),
  "updatedAt": zod.string(),
  "results": zod.array(zod.object({
    "id": zod.number(),
    "platform": zod.string(),
    "status": zod.string(),
    "externalId": zod.string().nullish(),
    "externalUrl": zod.string().nullish(),
    "error": zod.string().nullish(),
    "publishedAt": zod.string().nullish(),
    "metrics": zod.record(zod.string(), zod.unknown()).optional()
  })).optional()
});
var ListSocialPostsResponse = zod.array(ListSocialPostsResponseItem);
var CreateSocialPostBody = zod.object({
  "content": zod.string().optional(),
  "platforms": zod.array(zod.string()).optional(),
  "variants": zod.record(zod.string(), zod.string()).optional(),
  "mediaUrls": zod.array(zod.string()).optional(),
  "scheduledAt": zod.string().nullish(),
  "context": zod.record(zod.string(), zod.unknown()).optional(),
  "status": zod.string().optional()
});
var UpdateSocialPostParams = zod.object({
  "id": zod.coerce.number()
});
var UpdateSocialPostBody = zod.object({
  "content": zod.string().optional(),
  "platforms": zod.array(zod.string()).optional(),
  "variants": zod.record(zod.string(), zod.string()).optional(),
  "mediaUrls": zod.array(zod.string()).optional(),
  "scheduledAt": zod.string().nullish(),
  "context": zod.record(zod.string(), zod.unknown()).optional(),
  "status": zod.string().optional()
});
var UpdateSocialPostResponse = zod.object({
  "id": zod.number(),
  "content": zod.string(),
  "mediaUrls": zod.array(zod.string()).optional(),
  "platforms": zod.array(zod.string()),
  "variants": zod.record(zod.string(), zod.string()).optional(),
  "status": zod.string(),
  "scheduledAt": zod.string().nullish(),
  "publishedAt": zod.string().nullish(),
  "context": zod.record(zod.string(), zod.unknown()).optional(),
  "createdAt": zod.string(),
  "updatedAt": zod.string(),
  "results": zod.array(zod.object({
    "id": zod.number(),
    "platform": zod.string(),
    "status": zod.string(),
    "externalId": zod.string().nullish(),
    "externalUrl": zod.string().nullish(),
    "error": zod.string().nullish(),
    "publishedAt": zod.string().nullish(),
    "metrics": zod.record(zod.string(), zod.unknown()).optional()
  })).optional()
});
var DeleteSocialPostParams = zod.object({
  "id": zod.coerce.number()
});
var DeleteSocialPostResponse = zod.object({
  "message": zod.string()
});
var PublishSocialPostParams = zod.object({
  "id": zod.coerce.number()
});
var PublishSocialPostResponse = zod.object({
  "id": zod.number(),
  "content": zod.string(),
  "mediaUrls": zod.array(zod.string()).optional(),
  "platforms": zod.array(zod.string()),
  "variants": zod.record(zod.string(), zod.string()).optional(),
  "status": zod.string(),
  "scheduledAt": zod.string().nullish(),
  "publishedAt": zod.string().nullish(),
  "context": zod.record(zod.string(), zod.unknown()).optional(),
  "createdAt": zod.string(),
  "updatedAt": zod.string(),
  "results": zod.array(zod.object({
    "id": zod.number(),
    "platform": zod.string(),
    "status": zod.string(),
    "externalId": zod.string().nullish(),
    "externalUrl": zod.string().nullish(),
    "error": zod.string().nullish(),
    "publishedAt": zod.string().nullish(),
    "metrics": zod.record(zod.string(), zod.unknown()).optional()
  })).optional()
});
var DraftSocialPostBody = zod.object({
  "prompt": zod.string(),
  "platforms": zod.array(zod.string()),
  "tone": zod.string().optional(),
  "context": zod.string().optional()
});
var DraftSocialPostResponse = zod.object({
  "base": zod.string(),
  "variants": zod.record(zod.string(), zod.string())
});
var RewriteSocialPostBody = zod.object({
  "text": zod.string(),
  "tone": zod.string()
});
var RewriteSocialPostResponse = zod.object({
  "text": zod.string()
});
var GetSocialCalendarResponseItem = zod.object({
  "id": zod.number(),
  "content": zod.string(),
  "platforms": zod.array(zod.string()),
  "status": zod.string(),
  "scheduledAt": zod.string().nullish(),
  "publishedAt": zod.string().nullish()
});
var GetSocialCalendarResponse = zod.array(GetSocialCalendarResponseItem);
var ListEmailSuppressionsResponseItem = zod.object({
  "id": zod.number(),
  "email": zod.string(),
  "reason": zod.string(),
  "createdAt": zod.string()
});
var ListEmailSuppressionsResponse = zod.array(ListEmailSuppressionsResponseItem);
var CreateEmailSuppressionBody = zod.object({
  "email": zod.string(),
  "reason": zod.string().optional()
});
var DeleteEmailSuppressionParams = zod.object({
  "id": zod.coerce.number()
});
var DeleteEmailSuppressionResponse = zod.object({
  "message": zod.string()
});
var ListDripSequencesResponseItem = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "description": zod.string().nullish(),
  "trigger": zod.object({
    "entity": zod.enum(["leads", "clients"]),
    "filters": zod.record(zod.string(), zod.string()).optional()
  }),
  "fromEmail": zod.string(),
  "status": zod.string(),
  "createdAt": zod.string(),
  "updatedAt": zod.string(),
  "steps": zod.array(zod.object({
    "id": zod.number().optional(),
    "stepOrder": zod.number(),
    "delayDays": zod.number(),
    "subject": zod.string(),
    "body": zod.string()
  }))
});
var ListDripSequencesResponse = zod.array(ListDripSequencesResponseItem);
var CreateDripSequenceBody = zod.object({
  "name": zod.string().optional(),
  "description": zod.string().nullish(),
  "trigger": zod.object({
    "entity": zod.enum(["leads", "clients"]),
    "filters": zod.record(zod.string(), zod.string()).optional()
  }).optional(),
  "fromEmail": zod.string().optional(),
  "status": zod.string().optional(),
  "steps": zod.array(zod.object({
    "id": zod.number().optional(),
    "stepOrder": zod.number(),
    "delayDays": zod.number(),
    "subject": zod.string(),
    "body": zod.string()
  })).optional()
});
var UpdateDripSequenceParams = zod.object({
  "id": zod.coerce.number()
});
var UpdateDripSequenceBody = zod.object({
  "name": zod.string().optional(),
  "description": zod.string().nullish(),
  "trigger": zod.object({
    "entity": zod.enum(["leads", "clients"]),
    "filters": zod.record(zod.string(), zod.string()).optional()
  }).optional(),
  "fromEmail": zod.string().optional(),
  "status": zod.string().optional(),
  "steps": zod.array(zod.object({
    "id": zod.number().optional(),
    "stepOrder": zod.number(),
    "delayDays": zod.number(),
    "subject": zod.string(),
    "body": zod.string()
  })).optional()
});
var UpdateDripSequenceResponse = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "description": zod.string().nullish(),
  "trigger": zod.object({
    "entity": zod.enum(["leads", "clients"]),
    "filters": zod.record(zod.string(), zod.string()).optional()
  }),
  "fromEmail": zod.string(),
  "status": zod.string(),
  "createdAt": zod.string(),
  "updatedAt": zod.string(),
  "steps": zod.array(zod.object({
    "id": zod.number().optional(),
    "stepOrder": zod.number(),
    "delayDays": zod.number(),
    "subject": zod.string(),
    "body": zod.string()
  }))
});
var EnrollDripSequenceParams = zod.object({
  "id": zod.coerce.number()
});
var EnrollDripSequenceResponse = zod.object({
  "enrolled": zod.number()
});
var GetUnsubscribeParams = zod.object({
  "token": zod.coerce.string()
});
var GetUnsubscribeResponse = zod.object({
  "email": zod.string(),
  "status": zod.string()
});
var ConfirmUnsubscribeParams = zod.object({
  "token": zod.coerce.string()
});
var ConfirmUnsubscribeResponse = zod.object({
  "message": zod.string()
});
var GetAiInsightsQueryParams = zod.object({
  "refresh": zod.coerce.string().optional(),
  "date": zod.coerce.string().optional()
});
var GetAiInsightsResponse = zod.object({
  "forDate": zod.string(),
  "insights": zod.object({
    "headline": zod.string(),
    "bullets": zod.array(zod.string()),
    "suggestions": zod.array(zod.string())
  }),
  "metricsSnapshot": zod.record(zod.string(), zod.unknown()),
  "cached": zod.boolean()
});
var AiNlSearchBody = zod.object({
  "query": zod.string()
});
var AiNlSearchResponse = zod.object({
  "plan": zod.object({
    "intent": zod.string(),
    "entity": zod.string(),
    "filters": zod.record(zod.string(), zod.unknown()),
    "explanation": zod.string()
  }),
  "results": zod.array(zod.record(zod.string(), zod.unknown()))
});
var GetReportsCatalogResponseItem = zod.object({
  "key": zod.string(),
  "label": zod.string(),
  "description": zod.string(),
  "path": zod.string()
});
var GetReportsCatalogResponse = zod.array(GetReportsCatalogResponseItem);
var GetSalesRegisterQueryParams = zod.object({
  "from": zod.coerce.string().optional(),
  "to": zod.coerce.string().optional(),
  "format": zod.coerce.string().optional()
});
var GetSalesRegisterResponseItem = zod.object({
  "invoiceNumber": zod.string(),
  "issueDate": zod.string(),
  "clientName": zod.string().optional(),
  "status": zod.string(),
  "subtotal": zod.number(),
  "cgst": zod.number(),
  "sgst": zod.number(),
  "igst": zod.number(),
  "total": zod.number(),
  "amountPaid": zod.number(),
  "balance": zod.number()
});
var GetSalesRegisterResponse = zod.array(GetSalesRegisterResponseItem);
var GetPurchaseRegisterQueryParams = zod.object({
  "from": zod.coerce.string().optional(),
  "to": zod.coerce.string().optional(),
  "format": zod.coerce.string().optional()
});
var GetPurchaseRegisterResponseItem = zod.object({
  "poNumber": zod.string(),
  "date": zod.string(),
  "vendorName": zod.string().optional(),
  "status": zod.string(),
  "subtotal": zod.number(),
  "taxAmount": zod.number(),
  "total": zod.number()
});
var GetPurchaseRegisterResponse = zod.array(GetPurchaseRegisterResponseItem);
var GetCustomerAgeingQueryParams = zod.object({
  "format": zod.coerce.string().optional()
});
var GetCustomerAgeingResponseItem = zod.object({
  "clientId": zod.number(),
  "clientName": zod.string(),
  "current": zod.number(),
  "days30": zod.number(),
  "days60": zod.number(),
  "days90": zod.number(),
  "daysOver90": zod.number(),
  "total": zod.number()
});
var GetCustomerAgeingResponse = zod.array(GetCustomerAgeingResponseItem);
var GetTopItemsReportQueryParams = zod.object({
  "format": zod.coerce.string().optional()
});
var GetTopItemsReportResponseItem = zod.object({
  "name": zod.string(),
  "quantity": zod.number(),
  "revenue": zod.number()
});
var GetTopItemsReportResponse = zod.array(GetTopItemsReportResponseItem);
var GetLeadSourceRoiQueryParams = zod.object({
  "format": zod.coerce.string().optional()
});
var GetLeadSourceRoiResponseItem = zod.object({
  "source": zod.string(),
  "total": zod.number(),
  "won": zod.number(),
  "lost": zod.number(),
  "conversionPct": zod.number(),
  "revenue": zod.number()
});
var GetLeadSourceRoiResponse = zod.array(GetLeadSourceRoiResponseItem);
var GetSocialEngagementReportQueryParams = zod.object({
  "format": zod.coerce.string().optional()
});
var GetSocialEngagementReportResponseItem = zod.object({
  "id": zod.number(),
  "content": zod.string(),
  "platforms": zod.string(),
  "publishedAt": zod.string().nullish(),
  "likes": zod.number(),
  "comments": zod.number(),
  "shares": zod.number(),
  "impressions": zod.number()
});
var GetSocialEngagementReportResponse = zod.array(GetSocialEngagementReportResponseItem);
var GetEmailPerformanceReportQueryParams = zod.object({
  "format": zod.coerce.string().optional()
});
var GetEmailPerformanceReportResponseItem = zod.object({
  "campaignId": zod.number(),
  "name": zod.string(),
  "subject": zod.string(),
  "sentAt": zod.string().nullish(),
  "sent": zod.number(),
  "opened": zod.number(),
  "clicked": zod.number(),
  "openRate": zod.number(),
  "clickRate": zod.number()
});
var GetEmailPerformanceReportResponse = zod.array(GetEmailPerformanceReportResponseItem);
var ListEmployeesResponseItem = zod.object({
  "id": zod.number(),
  "employeeCode": zod.string(),
  "name": zod.string(),
  "email": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "role": zod.string().nullish(),
  "department": zod.string().nullish(),
  "dateOfJoining": zod.string().nullish(),
  "status": zod.enum(["active", "inactive", "terminated"]),
  "basic": zod.number(),
  "hra": zod.number(),
  "allowances": zod.number(),
  "otherDeductions": zod.number(),
  "pfEnabled": zod.boolean(),
  "esiEnabled": zod.boolean(),
  "bankName": zod.string().nullish(),
  "bankAccount": zod.string().nullish(),
  "ifsc": zod.string().nullish(),
  "panNumber": zod.string().nullish(),
  "leaveBalances": zod.record(zod.string(), zod.number()),
  "createdAt": zod.string(),
  "updatedAt": zod.string()
});
var ListEmployeesResponse = zod.array(ListEmployeesResponseItem);
var CreateEmployeeBody = zod.object({
  "employeeCode": zod.string().nullish(),
  "name": zod.string().nullish(),
  "email": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "role": zod.string().nullish(),
  "department": zod.string().nullish(),
  "dateOfJoining": zod.string().nullish(),
  "status": zod.union([zod.literal("active"), zod.literal("inactive"), zod.literal("terminated"), zod.literal(null)]).nullish(),
  "basic": zod.number().nullish(),
  "hra": zod.number().nullish(),
  "allowances": zod.number().nullish(),
  "otherDeductions": zod.number().nullish(),
  "pfEnabled": zod.boolean().nullish(),
  "esiEnabled": zod.boolean().nullish(),
  "bankName": zod.string().nullish(),
  "bankAccount": zod.string().nullish(),
  "ifsc": zod.string().nullish(),
  "panNumber": zod.string().nullish(),
  "leaveBalances": zod.record(zod.string(), zod.number()).nullish()
});
var GetEmployeeParams = zod.object({
  "id": zod.coerce.number()
});
var GetEmployeeResponse = zod.object({
  "id": zod.number(),
  "employeeCode": zod.string(),
  "name": zod.string(),
  "email": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "role": zod.string().nullish(),
  "department": zod.string().nullish(),
  "dateOfJoining": zod.string().nullish(),
  "status": zod.enum(["active", "inactive", "terminated"]),
  "basic": zod.number(),
  "hra": zod.number(),
  "allowances": zod.number(),
  "otherDeductions": zod.number(),
  "pfEnabled": zod.boolean(),
  "esiEnabled": zod.boolean(),
  "bankName": zod.string().nullish(),
  "bankAccount": zod.string().nullish(),
  "ifsc": zod.string().nullish(),
  "panNumber": zod.string().nullish(),
  "leaveBalances": zod.record(zod.string(), zod.number()),
  "createdAt": zod.string(),
  "updatedAt": zod.string()
});
var UpdateEmployeeParams = zod.object({
  "id": zod.coerce.number()
});
var UpdateEmployeeBody = zod.object({
  "employeeCode": zod.string().nullish(),
  "name": zod.string().nullish(),
  "email": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "role": zod.string().nullish(),
  "department": zod.string().nullish(),
  "dateOfJoining": zod.string().nullish(),
  "status": zod.union([zod.literal("active"), zod.literal("inactive"), zod.literal("terminated"), zod.literal(null)]).nullish(),
  "basic": zod.number().nullish(),
  "hra": zod.number().nullish(),
  "allowances": zod.number().nullish(),
  "otherDeductions": zod.number().nullish(),
  "pfEnabled": zod.boolean().nullish(),
  "esiEnabled": zod.boolean().nullish(),
  "bankName": zod.string().nullish(),
  "bankAccount": zod.string().nullish(),
  "ifsc": zod.string().nullish(),
  "panNumber": zod.string().nullish(),
  "leaveBalances": zod.record(zod.string(), zod.number()).nullish()
});
var UpdateEmployeeResponse = zod.object({
  "id": zod.number(),
  "employeeCode": zod.string(),
  "name": zod.string(),
  "email": zod.string().nullish(),
  "phone": zod.string().nullish(),
  "role": zod.string().nullish(),
  "department": zod.string().nullish(),
  "dateOfJoining": zod.string().nullish(),
  "status": zod.enum(["active", "inactive", "terminated"]),
  "basic": zod.number(),
  "hra": zod.number(),
  "allowances": zod.number(),
  "otherDeductions": zod.number(),
  "pfEnabled": zod.boolean(),
  "esiEnabled": zod.boolean(),
  "bankName": zod.string().nullish(),
  "bankAccount": zod.string().nullish(),
  "ifsc": zod.string().nullish(),
  "panNumber": zod.string().nullish(),
  "leaveBalances": zod.record(zod.string(), zod.number()),
  "createdAt": zod.string(),
  "updatedAt": zod.string()
});
var DeleteEmployeeParams = zod.object({
  "id": zod.coerce.number()
});
var DeleteEmployeeResponse = zod.object({
  "message": zod.string()
});
var ListAttendanceQueryParams = zod.object({
  "from": zod.coerce.string().optional(),
  "to": zod.coerce.string().optional(),
  "employeeId": zod.coerce.number().optional()
});
var ListAttendanceResponseItem = zod.object({
  "id": zod.number(),
  "employeeId": zod.number(),
  "date": zod.string(),
  "status": zod.enum(["present", "absent", "half", "leave", "holiday", "weekoff"]),
  "leaveType": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "createdAt": zod.string()
});
var ListAttendanceResponse = zod.array(ListAttendanceResponseItem);
var MarkAttendanceBody = zod.object({
  "employeeId": zod.number(),
  "date": zod.string().nullish(),
  "status": zod.enum(["present", "absent", "half", "leave", "holiday", "weekoff"]),
  "leaveType": zod.string().nullish(),
  "notes": zod.string().nullish()
});
var BulkAttendanceBody = zod.object({
  "date": zod.string(),
  "entries": zod.array(zod.object({
    "employeeId": zod.number(),
    "date": zod.string().nullish(),
    "status": zod.enum(["present", "absent", "half", "leave", "holiday", "weekoff"]),
    "leaveType": zod.string().nullish(),
    "notes": zod.string().nullish()
  }))
});
var ListLeavesResponseItem = zod.object({
  "id": zod.number(),
  "employeeId": zod.number(),
  "date": zod.string(),
  "status": zod.enum(["present", "absent", "half", "leave", "holiday", "weekoff"]),
  "leaveType": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "createdAt": zod.string()
});
var ListLeavesResponse = zod.array(ListLeavesResponseItem);
var GetLeaveBalancesResponseItem = zod.object({
  "employeeId": zod.number(),
  "employeeName": zod.string(),
  "balances": zod.record(zod.string(), zod.number()),
  "used": zod.record(zod.string(), zod.number())
});
var GetLeaveBalancesResponse = zod.array(GetLeaveBalancesResponseItem);
var ListLeaveRequestsResponseItem = zod.object({
  "id": zod.number(),
  "organizationId": zod.number(),
  "employeeId": zod.number(),
  "leaveType": zod.string(),
  "fromDate": zod.string(),
  "toDate": zod.string(),
  "days": zod.string(),
  "reason": zod.string().nullish(),
  "status": zod.enum(["pending", "approved", "rejected"]),
  "approverId": zod.number().nullish(),
  "decidedAt": zod.string().nullish(),
  "decisionNote": zod.string().nullish(),
  "createdAt": zod.string()
});
var ListLeaveRequestsResponse = zod.array(ListLeaveRequestsResponseItem);
var CreateLeaveRequestBody = zod.object({
  "employeeId": zod.number().nullish(),
  "leaveType": zod.string().optional(),
  "fromDate": zod.string(),
  "toDate": zod.string(),
  "days": zod.union([zod.number(), zod.string()]).nullish(),
  "reason": zod.string().nullish()
});
var ApproveLeaveRequestParams = zod.object({
  "id": zod.coerce.number()
});
var ApproveLeaveRequestBody = zod.object({
  "note": zod.string().nullish()
});
var ApproveLeaveRequestResponse = zod.object({
  "id": zod.number(),
  "organizationId": zod.number(),
  "employeeId": zod.number(),
  "leaveType": zod.string(),
  "fromDate": zod.string(),
  "toDate": zod.string(),
  "days": zod.string(),
  "reason": zod.string().nullish(),
  "status": zod.enum(["pending", "approved", "rejected"]),
  "approverId": zod.number().nullish(),
  "decidedAt": zod.string().nullish(),
  "decisionNote": zod.string().nullish(),
  "createdAt": zod.string()
});
var RejectLeaveRequestParams = zod.object({
  "id": zod.coerce.number()
});
var RejectLeaveRequestBody = zod.object({
  "note": zod.string().nullish()
});
var RejectLeaveRequestResponse = zod.object({
  "id": zod.number(),
  "organizationId": zod.number(),
  "employeeId": zod.number(),
  "leaveType": zod.string(),
  "fromDate": zod.string(),
  "toDate": zod.string(),
  "days": zod.string(),
  "reason": zod.string().nullish(),
  "status": zod.enum(["pending", "approved", "rejected"]),
  "approverId": zod.number().nullish(),
  "decidedAt": zod.string().nullish(),
  "decisionNote": zod.string().nullish(),
  "createdAt": zod.string()
});
var ListPayrollRunsResponseItem = zod.object({
  "id": zod.number(),
  "periodMonth": zod.number(),
  "periodYear": zod.number(),
  "status": zod.enum(["draft", "computed", "paid"]),
  "totalGross": zod.number(),
  "totalDeductions": zod.number(),
  "totalNet": zod.number(),
  "notes": zod.string().nullish(),
  "paidAt": zod.string().nullish(),
  "createdAt": zod.string()
});
var ListPayrollRunsResponse = zod.array(ListPayrollRunsResponseItem);
var CreatePayrollRunBody = zod.object({
  "periodMonth": zod.number(),
  "periodYear": zod.number(),
  "notes": zod.string().nullish()
});
var GetPayrollRunParams = zod.object({
  "id": zod.coerce.number()
});
var GetPayrollRunResponse = zod.object({
  "id": zod.number(),
  "periodMonth": zod.number(),
  "periodYear": zod.number(),
  "status": zod.enum(["draft", "computed", "paid"]),
  "totalGross": zod.number(),
  "totalDeductions": zod.number(),
  "totalNet": zod.number(),
  "notes": zod.string().nullish(),
  "paidAt": zod.string().nullish(),
  "createdAt": zod.string()
}).and(zod.object({
  "payslips": zod.array(zod.object({
    "id": zod.number(),
    "payrollRunId": zod.number(),
    "employeeId": zod.number(),
    "employeeName": zod.string().nullish(),
    "employeeCode": zod.string().nullish(),
    "basic": zod.number(),
    "hra": zod.number(),
    "allowances": zod.number(),
    "daysWorked": zod.number(),
    "daysInMonth": zod.number(),
    "lopAmount": zod.number(),
    "pfAmount": zod.number(),
    "esiAmount": zod.number(),
    "otherDeductions": zod.number(),
    "gross": zod.number(),
    "deductions": zod.number(),
    "net": zod.number(),
    "status": zod.enum(["pending", "paid"]),
    "paidAt": zod.string().nullish()
  })).optional()
}));
var MarkPayrollPaidParams = zod.object({
  "id": zod.coerce.number()
});
var MarkPayrollPaidResponse = zod.object({
  "message": zod.string()
});
var ListExpenseCategoriesResponseItem = zod.object({
  "id": zod.number(),
  "name": zod.string(),
  "accountCode": zod.string().nullish(),
  "isSystem": zod.boolean(),
  "createdAt": zod.string()
});
var ListExpenseCategoriesResponse = zod.array(ListExpenseCategoriesResponseItem);
var CreateExpenseCategoryBody = zod.object({
  "name": zod.string(),
  "accountCode": zod.string().nullish()
});
var ListExpensesQueryParams = zod.object({
  "from": zod.coerce.string().optional(),
  "to": zod.coerce.string().optional()
});
var ListExpensesResponseItem = zod.object({
  "id": zod.number(),
  "expenseDate": zod.string(),
  "categoryId": zod.number().nullish(),
  "vendorName": zod.string().nullish(),
  "description": zod.string().nullish(),
  "amount": zod.number(),
  "gstRate": zod.number(),
  "gstAmount": zod.number(),
  "total": zod.number(),
  "paymentMethod": zod.enum(["cash", "bank", "upi", "card", "cheque", "other"]),
  "receiptUrl": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "createdAt": zod.string()
});
var ListExpensesResponse = zod.array(ListExpensesResponseItem);
var CreateExpenseBody = zod.object({
  "expenseDate": zod.string(),
  "categoryId": zod.number().nullish(),
  "vendorName": zod.string().nullish(),
  "description": zod.string().nullish(),
  "amount": zod.number(),
  "gstRate": zod.number().nullish(),
  "paymentMethod": zod.union([zod.literal("cash"), zod.literal("bank"), zod.literal("upi"), zod.literal("card"), zod.literal("cheque"), zod.literal("other"), zod.literal(null)]).nullish(),
  "receiptUrl": zod.string().nullish(),
  "notes": zod.string().nullish()
});
var UpdateExpenseParams = zod.object({
  "id": zod.coerce.number()
});
var UpdateExpenseBody = zod.object({
  "expenseDate": zod.string(),
  "categoryId": zod.number().nullish(),
  "vendorName": zod.string().nullish(),
  "description": zod.string().nullish(),
  "amount": zod.number(),
  "gstRate": zod.number().nullish(),
  "paymentMethod": zod.union([zod.literal("cash"), zod.literal("bank"), zod.literal("upi"), zod.literal("card"), zod.literal("cheque"), zod.literal("other"), zod.literal(null)]).nullish(),
  "receiptUrl": zod.string().nullish(),
  "notes": zod.string().nullish()
});
var UpdateExpenseResponse = zod.object({
  "id": zod.number(),
  "expenseDate": zod.string(),
  "categoryId": zod.number().nullish(),
  "vendorName": zod.string().nullish(),
  "description": zod.string().nullish(),
  "amount": zod.number(),
  "gstRate": zod.number(),
  "gstAmount": zod.number(),
  "total": zod.number(),
  "paymentMethod": zod.enum(["cash", "bank", "upi", "card", "cheque", "other"]),
  "receiptUrl": zod.string().nullish(),
  "notes": zod.string().nullish(),
  "createdAt": zod.string()
});
var DeleteExpenseParams = zod.object({
  "id": zod.coerce.number()
});
var DeleteExpenseResponse = zod.object({
  "message": zod.string()
});
var ListAccountsResponseItem = zod.object({
  "id": zod.number(),
  "code": zod.string(),
  "name": zod.string(),
  "type": zod.enum(["asset", "liability", "equity", "income", "expense"]),
  "subtype": zod.string().nullish(),
  "isSystem": zod.boolean(),
  "isActive": zod.boolean(),
  "createdAt": zod.string()
});
var ListAccountsResponse = zod.array(ListAccountsResponseItem);
var CreateAccountBody = zod.object({
  "code": zod.string(),
  "name": zod.string(),
  "type": zod.enum(["asset", "liability", "equity", "income", "expense"]),
  "subtype": zod.string().nullish()
});
var ListJournalEntriesQueryParams = zod.object({
  "from": zod.coerce.string().optional(),
  "to": zod.coerce.string().optional()
});
var ListJournalEntriesResponseItem = zod.object({
  "id": zod.number(),
  "entryDate": zod.string(),
  "memo": zod.string().nullish(),
  "sourceType": zod.string().nullish(),
  "sourceId": zod.number().nullish(),
  "createdAt": zod.string(),
  "lines": zod.array(zod.object({
    "id": zod.number(),
    "accountId": zod.number(),
    "accountCode": zod.string(),
    "accountName": zod.string(),
    "debit": zod.number(),
    "credit": zod.number(),
    "description": zod.string().nullish()
  }))
});
var ListJournalEntriesResponse = zod.array(ListJournalEntriesResponseItem);
var CreateJournalEntryBody = zod.object({
  "entryDate": zod.string(),
  "memo": zod.string().nullish(),
  "lines": zod.array(zod.object({
    "accountCode": zod.string(),
    "debit": zod.number().nullish(),
    "credit": zod.number().nullish(),
    "description": zod.string().nullish()
  }))
});
var GetLedgerQueryParams = zod.object({
  "accountId": zod.coerce.number(),
  "from": zod.coerce.string().optional(),
  "to": zod.coerce.string().optional()
});
var GetLedgerResponse = zod.object({
  "account": zod.object({
    "id": zod.number(),
    "code": zod.string(),
    "name": zod.string(),
    "type": zod.string()
  }),
  "lines": zod.array(zod.object({
    "lineId": zod.number(),
    "entryId": zod.number(),
    "entryDate": zod.string(),
    "memo": zod.string().nullish(),
    "sourceType": zod.string().nullish(),
    "sourceId": zod.number().nullish(),
    "description": zod.string().nullish(),
    "debit": zod.number(),
    "credit": zod.number(),
    "balance": zod.number()
  })),
  "closingBalance": zod.number()
});
var GetPnlQueryParams = zod.object({
  "from": zod.coerce.string().optional(),
  "to": zod.coerce.string().optional(),
  "compare": zod.coerce.string().optional()
});
var GetPnlResponse = zod.object({
  "current": zod.object({
    "from": zod.string(),
    "to": zod.string(),
    "income": zod.array(zod.object({
      "code": zod.string(),
      "name": zod.string(),
      "amount": zod.number()
    })),
    "expense": zod.array(zod.object({
      "code": zod.string(),
      "name": zod.string(),
      "amount": zod.number()
    })),
    "totalIncome": zod.number(),
    "totalExpense": zod.number(),
    "netProfit": zod.number()
  }),
  "previous": zod.union([zod.object({
    "from": zod.string(),
    "to": zod.string(),
    "income": zod.array(zod.object({
      "code": zod.string(),
      "name": zod.string(),
      "amount": zod.number()
    })),
    "expense": zod.array(zod.object({
      "code": zod.string(),
      "name": zod.string(),
      "amount": zod.number()
    })),
    "totalIncome": zod.number(),
    "totalExpense": zod.number(),
    "netProfit": zod.number()
  }), zod.null()]).optional()
});
var GetGstr1QueryParams = zod.object({
  "from": zod.coerce.string().optional(),
  "to": zod.coerce.string().optional(),
  "format": zod.coerce.string().optional()
});
var GetGstr1Response = zod.object({
  "from": zod.string(),
  "to": zod.string(),
  "b2b": zod.array(zod.object({
    "invoiceNumber": zod.string(),
    "invoiceDate": zod.string(),
    "clientName": zod.string(),
    "gstin": zod.string().optional(),
    "placeOfSupply": zod.string().optional(),
    "taxableValue": zod.number(),
    "rate": zod.number(),
    "cgst": zod.number(),
    "sgst": zod.number(),
    "igst": zod.number(),
    "invoiceTotal": zod.number()
  })),
  "b2c": zod.array(zod.object({
    "invoiceNumber": zod.string(),
    "invoiceDate": zod.string(),
    "clientName": zod.string(),
    "gstin": zod.string().optional(),
    "placeOfSupply": zod.string().optional(),
    "taxableValue": zod.number(),
    "rate": zod.number(),
    "cgst": zod.number(),
    "sgst": zod.number(),
    "igst": zod.number(),
    "invoiceTotal": zod.number()
  })),
  "summary": zod.object({
    "invoices": zod.number(),
    "taxableValue": zod.number(),
    "cgst": zod.number(),
    "sgst": zod.number(),
    "igst": zod.number(),
    "totalTax": zod.number()
  })
});
var GetGstr3bQueryParams = zod.object({
  "from": zod.coerce.string().optional(),
  "to": zod.coerce.string().optional(),
  "format": zod.coerce.string().optional()
});
var GetGstr3bResponse = zod.object({
  "from": zod.string(),
  "to": zod.string(),
  "outwardSupplies": zod.object({
    "taxable": zod.number(),
    "cgst": zod.number(),
    "sgst": zod.number(),
    "igst": zod.number()
  }),
  "itc": zod.object({
    "cgstSgstInputs": zod.number(),
    "igstInputs": zod.number(),
    "total": zod.number()
  }),
  "netTaxPayable": zod.number()
});
var GetVendorAgeingResponseItem = zod.object({
  "vendorId": zod.number(),
  "vendorName": zod.string(),
  "current": zod.number(),
  "days30": zod.number(),
  "days60": zod.number(),
  "days90": zod.number(),
  "daysOver90": zod.number(),
  "total": zod.number()
});
var GetVendorAgeingResponse = zod.array(GetVendorAgeingResponseItem);
var GetBalanceSheetQueryParams = zod.object({
  "asOf": zod.coerce.string().optional(),
  "format": zod.coerce.string().optional()
});
var GetBalanceSheetResponse = zod.object({
  "asOf": zod.string(),
  "assets": zod.array(zod.object({
    "code": zod.string(),
    "name": zod.string(),
    "amount": zod.number()
  })),
  "liabilities": zod.array(zod.object({
    "code": zod.string(),
    "name": zod.string(),
    "amount": zod.number()
  })),
  "equity": zod.array(zod.object({
    "code": zod.string(),
    "name": zod.string(),
    "amount": zod.number()
  })),
  "totals": zod.object({
    "assets": zod.number(),
    "liabilities": zod.number(),
    "equity": zod.number(),
    "liabilitiesAndEquity": zod.number(),
    "difference": zod.number()
  }),
  "equityReconciliation": zod.object({
    "fyStart": zod.string(),
    "openingEquity": zod.number(),
    "openingRetainedEarnings": zod.number(),
    "periodNetProfit": zod.number(),
    "totalEquity": zod.number()
  })
});

// src/routes/health.ts
var router = (0, import_express.Router)();
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});
var health_default = router;

// src/routes/auth.ts
var import_express2 = require("express");
var import_bcryptjs = __toESM(require("bcryptjs"), 1);

// src/lib/firebase.ts
var import_app = require("firebase-admin/app");
var import_firestore = require("firebase-admin/firestore");
var app;
var firestore;
var initError = null;
function cleanPrivateKey(raw) {
  if (!raw) return void 0;
  let key = raw;
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, "\n").replace(/\\r/g, "");
  if (!key.includes("BEGIN")) {
    return void 0;
  }
  return key;
}
function getFirebaseInitError() {
  return initError;
}
function initFirebase() {
  if (app) return app;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  try {
    if (projectId && clientEmail && privateKey) {
      app = (0, import_app.initializeApp)({
        credential: (0, import_app.cert)({ projectId, clientEmail, privateKey })
      });
    } else {
      initError = `Missing Firebase credentials: PROJECT_ID=${!!projectId}, CLIENT_EMAIL=${!!clientEmail}, PRIVATE_KEY=${!!privateKey}`;
      console.warn("[firebase]", initError);
      app = (0, import_app.initializeApp)({
        projectId: projectId || "msme-erp"
      });
    }
    firestore = (0, import_firestore.getFirestore)(app);
    firestore.settings({ ignoreUndefinedProperties: true });
    return app;
  } catch (err) {
    initError = `Firebase init failed: ${err?.message ?? err}`;
    console.error("[firebase]", initError);
    throw err;
  }
}
function getDb() {
  if (!firestore) initFirebase();
  return firestore;
}

// src/middlewares/auth.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);

// src/lib/ttl-cache.ts
var store = /* @__PURE__ */ new Map();
var hitCount = 0;
var missCount = 0;
function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) {
    missCount++;
    return void 0;
  }
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    missCount++;
    return void 0;
  }
  hitCount++;
  return entry.value;
}
function cacheSet(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}
function cacheDelete(key) {
  store.delete(key);
}
function cacheDeletePrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
function cacheStats() {
  return { size: store.size, hits: hitCount, misses: missCount };
}
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
}, 3e5);

// src/middlewares/auth.ts
var JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
var JWT_EXPIRES_IN = "30d";
var AUTH_CACHE_TTL = 5 * 60 * 1e3;
function signToken(payload) {
  return import_jsonwebtoken.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
function verifyToken(token) {
  return import_jsonwebtoken.default.verify(token, JWT_SECRET);
}
async function requireUser(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing auth token" });
      return;
    }
    const token = header.slice(7);
    const decoded = verifyToken(token);
    const cacheKey = `user:${decoded.userId}`;
    let user = cacheGet(cacheKey);
    if (!user) {
      const userSnap = await getDb().collection("users").doc(decoded.userId).get();
      user = userSnap.data();
      if (user) cacheSet(cacheKey, user, AUTH_CACHE_TTL);
    }
    if (!user || !user.isActive) {
      res.status(401).json({ error: "User not found or inactive" });
      return;
    }
    req.user = {
      userId: decoded.userId,
      email: user.email,
      activeOrgId: decoded.activeOrgId,
      organizationId: decoded.activeOrgId ?? "",
      role: "viewer"
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid auth token" });
  }
}
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing auth token" });
      return;
    }
    const token = header.slice(7);
    const decoded = verifyToken(token);
    if (!decoded.activeOrgId) {
      res.status(403).json({ error: "No active organization. Create or select one first." });
      return;
    }
    const cacheKey = `auth:${decoded.userId}:${decoded.activeOrgId}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      req.user = cached;
      next();
      return;
    }
    const db46 = getDb();
    const [userSnap, orgSnap] = await Promise.all([
      db46.collection("users").doc(decoded.userId).get(),
      db46.collection("organizations").doc(decoded.activeOrgId).get()
    ]);
    const memberQuery = db46.collection("organization_members").where("userId", "==", decoded.userId).where("organizationId", "==", decoded.activeOrgId).limit(1);
    let memberSnap;
    let indexFailed = false;
    try {
      memberSnap = await memberQuery.get();
    } catch (err) {
      if (err?.code === 9 || err?.code === "FAILED_PRECONDITION") {
        console.warn("[auth] Missing Firestore composite index for organization_members query. Granting viewer role as fallback.");
        indexFailed = true;
        memberSnap = { empty: true, docs: [] };
      } else {
        throw err;
      }
    }
    const user = userSnap.data();
    if (!user || !user.isActive) {
      res.status(401).json({ error: "User not found or inactive" });
      return;
    }
    if (memberSnap.empty) {
      if (indexFailed) {
        const authData2 = {
          userId: decoded.userId,
          email: user.email,
          activeOrgId: decoded.activeOrgId,
          organizationId: decoded.activeOrgId,
          role: "viewer"
        };
        cacheSet(cacheKey, authData2, AUTH_CACHE_TTL);
        req.user = authData2;
        next();
        return;
      }
      res.status(403).json({ error: "You are not a member of this organization." });
      return;
    }
    if (!orgSnap.exists) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }
    const member = memberSnap.docs[0].data();
    const authData = {
      userId: decoded.userId,
      email: user.email,
      activeOrgId: decoded.activeOrgId,
      organizationId: decoded.activeOrgId,
      role: member.role
    };
    cacheSet(cacheKey, authData, AUTH_CACHE_TTL);
    req.user = authData;
    next();
  } catch {
    res.status(401).json({ error: "Invalid auth token" });
  }
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Requires role: ${roles.join(" or ")}` });
      return;
    }
    next();
  };
}
var requireOwner = requireRole("owner");
var requireAdmin = requireRole("owner", "admin");
var requireSales = requireRole("owner", "admin", "sales", "sales_executive");

// src/routes/auth.ts
init_logger();
var AUTH_CACHE_TTL2 = 5 * 60 * 1e3;
var authRouter = (0, import_express2.Router)();
var db = () => getDb();
var DEFAULT_LIMITS = { members: 3, leadsPerMonth: 50, emailsPerMonth: 100, storageMB: 100 };
var DEFAULT_MODULES = {
  sales: true,
  leads: true,
  inventory: false,
  purchase: false,
  marketing: false,
  hr: false,
  accounting: false,
  social: false
};
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "org";
}
async function ensureUniqueSlug(base) {
  let slug = base;
  let i = 1;
  while (true) {
    const snap = await db().collection("organizations").where("slug", "==", slug).limit(1).get();
    if (snap.empty) return slug;
    i += 1;
    slug = `${base}-${i}`;
  }
}
authRouter.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {};
    if (!name || !email || !password) {
      res.status(400).json({ error: "name, email, password required" });
      return;
    }
    if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await db().collection("users").where("email", "==", normalizedEmail).limit(1).get();
    if (!existing.empty) {
      const existingUser = existing.docs[0].data();
      const ok = await import_bcryptjs.default.compare(password, existingUser.passwordHash);
      if (ok) {
        const userDoc = existing.docs[0];
        await userDoc.ref.update({ lastLogin: (/* @__PURE__ */ new Date()).toISOString() });
        const memberSnap = await db().collection("organization_members").where("userId", "==", userDoc.id).get();
        const orgIds = memberSnap.docs.map((m) => m.data().organizationId).filter(Boolean);
        const orgSnaps = await Promise.all(orgIds.map((id) => db().collection("organizations").doc(id).get()));
        let activeOrgId = null;
        const orgs = [];
        for (let i = 0; i < memberSnap.docs.length; i++) {
          const m = memberSnap.docs[i].data();
          const orgSnap = orgSnaps[i];
          if (orgSnap.exists) {
            const org = orgSnap.data();
            orgs.push({ id: orgIds[i], name: org.name, slug: org.slug, role: m.role });
            if (!activeOrgId) activeOrgId = orgIds[i];
          }
        }
        const token2 = signToken({ userId: userDoc.id, email: normalizedEmail, activeOrgId });
        res.json({ token: token2, user: { id: userDoc.id, name: existingUser.name, email: normalizedEmail }, activeOrgId, organizations: orgs });
        return;
      }
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }
    const passwordHash = await import_bcryptjs.default.hash(password, 10);
    const userRef = await db().collection("users").add({
      name,
      email: normalizedEmail,
      passwordHash,
      phone: null,
      isActive: true,
      lastLogin: null,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const token = signToken({ userId: userRef.id, email: normalizedEmail, activeOrgId: null });
    res.status(201).json({
      token,
      user: { id: userRef.id, name, email: normalizedEmail },
      activeOrgId: null,
      organizations: []
    });
  } catch (err) {
    logger.error({ err }, "Signup failed");
    res.status(500).json({ error: "Signup failed" });
  }
});
authRouter.post("/auth/signup-with-org", async (req, res) => {
  try {
    const { name, email, password, organizationName, industry } = req.body ?? {};
    if (!name || !email || !password || !organizationName) {
      res.status(400).json({ error: "name, email, password, organizationName required" });
      return;
    }
    if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await db().collection("users").where("email", "==", normalizedEmail).limit(1).get();
    if (!existing.empty) {
      const existingUser = existing.docs[0].data();
      const ok = await import_bcryptjs.default.compare(password, existingUser.passwordHash);
      if (ok) {
        const userDoc = existing.docs[0];
        await userDoc.ref.update({ lastLogin: (/* @__PURE__ */ new Date()).toISOString() });
        const memberSnap = await db().collection("organization_members").where("userId", "==", userDoc.id).get();
        const orgIds2 = memberSnap.docs.map((m) => m.data().organizationId);
        const orgSnaps2 = await Promise.all(orgIds2.map((id) => db().collection("organizations").doc(id).get()));
        let activeOrgId = null;
        const orgs = [];
        for (let i = 0; i < memberSnap.docs.length; i++) {
          const m = memberSnap.docs[i].data();
          const orgSnap = orgSnaps2[i];
          if (orgSnap.exists) {
            const org = orgSnap.data();
            orgs.push({ id: orgIds2[i], name: org.name, slug: org.slug, role: m.role });
            if (!activeOrgId) activeOrgId = orgIds2[i];
          }
        }
        const token2 = signToken({ userId: userDoc.id, email: normalizedEmail, activeOrgId });
        res.json({ token: token2, user: { id: userDoc.id, name: existingUser.name, email: normalizedEmail }, activeOrgId, organizations: orgs });
        return;
      }
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }
    const batch = db().batch();
    const passwordHash = await import_bcryptjs.default.hash(password, 10);
    const userRef = db().collection("users").doc();
    batch.set(userRef, {
      name,
      email: normalizedEmail,
      passwordHash,
      phone: null,
      isActive: true,
      lastLogin: null,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const slug = await ensureUniqueSlug(slugify(organizationName));
    const orgRef = db().collection("organizations").doc();
    batch.set(orgRef, {
      name: organizationName,
      slug,
      plan: "free",
      industry: industry ?? null,
      limits: { ...DEFAULT_LIMITS },
      modules: { ...DEFAULT_MODULES },
      salesSettings: { allowOverselling: false, reserveStockOnDraft: false },
      payrollSettings: { autoRunEnabled: false, autoRunDay: 1, emailPayslips: false },
      gstNumber: null,
      state: null,
      address: null,
      phone: null,
      createdById: userRef.id,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const memberRef = db().collection("organization_members").doc();
    batch.set(memberRef, {
      organizationId: orgRef.id,
      userId: userRef.id,
      role: "owner",
      invitedById: null,
      joinedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    await batch.commit();
    const token = signToken({ userId: userRef.id, email: normalizedEmail, activeOrgId: orgRef.id });
    res.status(201).json({
      token,
      user: { id: userRef.id, name, email: normalizedEmail },
      activeOrgId: orgRef.id,
      organizations: [{ id: orgRef.id, name: organizationName, slug, role: "owner" }]
    });
  } catch (err) {
    logger.error({ err }, "Signup with org failed");
    res.status(500).json({ error: "Signup failed" });
  }
});
authRouter.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: "email and password required" });
      return;
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    let userSnap;
    try {
      userSnap = await db().collection("users").where("email", "==", normalizedEmail).limit(1).get();
    } catch (dbErr) {
      logger.error({ err: dbErr }, "Firestore query failed during login");
      res.status(500).json({ error: "Database error during login" });
      return;
    }
    if (userSnap.empty) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const userDoc = userSnap.docs[0];
    const user = userDoc.data();
    if (!user.isActive) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    if (!user.passwordHash) {
      logger.error({ userId: userDoc.id }, "User has no passwordHash");
      res.status(500).json({ error: "Login configuration error" });
      return;
    }
    let ok;
    try {
      ok = await import_bcryptjs.default.compare(String(password), String(user.passwordHash));
    } catch (bcryptErr) {
      logger.error({ err: bcryptErr }, "bcrypt compare failed");
      res.status(500).json({ error: "Authentication error" });
      return;
    }
    if (!ok) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    try {
      await userDoc.ref.update({ lastLogin: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (updateErr) {
      logger.error({ err: updateErr }, "Failed to update lastLogin");
    }
    const memberSnap = await db().collection("organization_members").where("userId", "==", userDoc.id).get();
    const orgIds = memberSnap.docs.map((m) => m.data().organizationId);
    const orgSnaps = await Promise.all(orgIds.map((id) => db().collection("organizations").doc(id).get()));
    const memberships = [];
    for (let i = 0; i < memberSnap.docs.length; i++) {
      const m = memberSnap.docs[i].data();
      const orgSnap = orgSnaps[i];
      if (orgSnap.exists) {
        const org = orgSnap.data();
        memberships.push({ orgId: orgIds[i], role: m.role, orgName: org.name, orgSlug: org.slug });
      }
    }
    const activeOrgId = memberships[0]?.orgId ?? null;
    const token = signToken({ userId: userDoc.id, email: user.email, activeOrgId });
    res.json({
      token,
      user: { id: userDoc.id, name: user.name, email: user.email },
      activeOrgId,
      organizations: memberships.map((m) => ({
        id: m.orgId,
        name: m.orgName,
        slug: m.orgSlug,
        role: m.role
      }))
    });
  } catch (err) {
    logger.error({ err, body: req.body }, "Login failed");
    res.status(500).json({ error: "Login failed" });
  }
});
authRouter.get("/auth/me", requireUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const cacheKey = `me:${userId}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
    const [userSnap, memberSnap] = await Promise.all([
      db().collection("users").doc(userId).get(),
      db().collection("organization_members").where("userId", "==", userId).get()
    ]);
    if (!userSnap.exists) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const user = userSnap.data();
    const orgIds = memberSnap.docs.map((m) => m.data().organizationId);
    const orgSnaps = await Promise.all(orgIds.map((id) => db().collection("organizations").doc(id).get()));
    const memberships = [];
    for (let i = 0; i < memberSnap.docs.length; i++) {
      const m = memberSnap.docs[i].data();
      const orgSnap = orgSnaps[i];
      if (orgSnap?.exists) {
        const org = orgSnap.data();
        memberships.push({ orgId: orgIds[i], role: m.role ?? "viewer", orgName: org.name ?? "", orgSlug: org.slug ?? "" });
      }
    }
    const result = {
      user: { id: userId, name: user.name, email: user.email, phone: user.phone ?? null },
      activeOrgId: req.user.activeOrgId,
      organizations: memberships.map((m) => ({
        id: m.orgId,
        name: m.orgName,
        slug: m.orgSlug,
        role: m.role
      }))
    };
    cacheSet(cacheKey, result, AUTH_CACHE_TTL2);
    res.json(result);
  } catch (err) {
    logger.error({ err, userId: req.user?.userId }, "auth/me failed");
    res.status(500).json({ error: "Failed to fetch user" });
  }
});
authRouter.post("/auth/switch-org", requireUser, async (req, res) => {
  const { organizationId } = req.body ?? {};
  if (!organizationId) {
    res.status(400).json({ error: "organizationId required" });
    return;
  }
  const memberSnap = await db().collection("organization_members").where("userId", "==", req.user.userId).where("organizationId", "==", organizationId).limit(1).get();
  if (memberSnap.empty) {
    res.status(403).json({ error: "Not a member of that organization" });
    return;
  }
  const targetMembership = memberSnap.docs[0].data();
  const token = signToken({
    userId: req.user.userId,
    email: req.user.email,
    activeOrgId: organizationId
  });
  cacheDeletePrefix(`auth:${req.user.userId}:`);
  res.json({ token, activeOrgId: organizationId, role: targetMembership.role });
});
authRouter.post("/auth/logout", requireAuth, async (_req, res) => {
  cacheDeletePrefix(`auth:${_req.user.userId}:`);
  cacheDelete(`user:${_req.user.userId}`);
  res.json({ message: "Logged out" });
});
var auth_default = authRouter;

// src/routes/organizations.ts
var import_express3 = require("express");
var import_node_crypto = __toESM(require("node:crypto"), 1);
var import_bcryptjs2 = __toESM(require("bcryptjs"), 1);

// src/lib/auditLog.ts
var import_firestore2 = require("firebase-admin/firestore");
var db2 = () => getDb();
async function logAction(req, action, entity, entityId, details) {
  if (!req.user?.organizationId) return;
  await db2().collection("auditLogs").add({
    organizationId: req.user.organizationId,
    userId: req.user?.userId ?? null,
    action,
    entity,
    entityId: entityId ?? null,
    details: details ?? null,
    ipAddress: req.ip ?? null,
    createdAt: import_firestore2.FieldValue.serverTimestamp(),
    updatedAt: import_firestore2.FieldValue.serverTimestamp()
  });
}

// src/routes/organizations.ts
var db3 = () => getDb();
var orgRouter = (0, import_express3.Router)();
var DEFAULT_LIMITS2 = {
  clients: 100,
  products: 100,
  quotations: 100,
  addons: 100
};
var DEFAULT_MODULES2 = {
  sales: true,
  inventory: true,
  payroll: false,
  reports: true
};
var DEFAULT_PAYROLL_SETTINGS = {
  autoRunDay: 1,
  autoRunEnabled: false,
  emailPayslips: false
};
function slugify2(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "org";
}
async function ensureUniqueSlug2(base) {
  let slug = base;
  let i = 1;
  while (true) {
    const snap = await db3().collection("organizations").where("slug", "==", slug).get();
    if (snap.empty) return slug;
    i += 1;
    slug = `${base}-${i}`;
  }
}
orgRouter.post("/organizations", requireUser, async (req, res) => {
  const { name, industry, gstNumber, state, address, phone } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const slug = await ensureUniqueSlug2(slugify2(name));
  const orgData = {
    name,
    slug,
    plan: "free",
    industry: industry ?? null,
    gstNumber: gstNumber ?? null,
    state: state ?? null,
    address: address ?? null,
    phone: phone ?? null,
    limits: { ...DEFAULT_LIMITS2 },
    modules: { ...DEFAULT_MODULES2 },
    salesSettings: {},
    payrollSettings: { ...DEFAULT_PAYROLL_SETTINGS },
    createdById: req.user.userId,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const orgRef = await db3().collection("organizations").add(orgData);
  await db3().collection("organization_members").add({
    organizationId: orgRef.id,
    userId: req.user.userId,
    role: "owner",
    joinedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  const token = signToken({
    userId: req.user.userId,
    email: req.user.email,
    activeOrgId: orgRef.id
  });
  res.status(201).json({
    token,
    organization: formatOrg({ id: orgRef.id, ...orgData }),
    role: "owner"
  });
});
function formatOrg(o) {
  return {
    id: o.id,
    name: o.name,
    slug: o.slug,
    plan: o.plan,
    industry: o.industry ?? null,
    gstNumber: o.gstNumber ?? null,
    state: o.state ?? null,
    address: o.address ?? null,
    phone: o.phone ?? null,
    limits: o.limits,
    modules: o.modules,
    salesSettings: o.salesSettings,
    payrollSettings: { ...DEFAULT_PAYROLL_SETTINGS, ...o.payrollSettings ?? {} },
    createdAt: o.createdAt
  };
}
orgRouter.get("/organizations/current", requireAuth, async (req, res) => {
  const snap = await db3().collection("organizations").doc(req.user.organizationId).get();
  if (!snap.exists) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }
  res.json(formatOrg({ id: snap.id, ...snap.data() }));
});
orgRouter.patch("/organizations/current", requireAuth, requireAdmin, async (req, res) => {
  const { name, industry, gstNumber, state, address, phone, salesSettings, payrollSettings } = req.body ?? {};
  const updates = {};
  if (name !== void 0) updates.name = name;
  if (industry !== void 0) updates.industry = industry;
  if (gstNumber !== void 0) updates.gstNumber = gstNumber;
  if (state !== void 0) updates.state = state;
  if (address !== void 0) updates.address = address;
  if (phone !== void 0) updates.phone = phone;
  if (salesSettings !== void 0 && typeof salesSettings === "object" && salesSettings !== null) {
    const currentSnap = await db3().collection("organizations").doc(req.user.organizationId).get();
    const current = currentSnap.data();
    updates.salesSettings = {
      ...current?.salesSettings ?? {},
      ...salesSettings
    };
  }
  if (payrollSettings !== void 0 && typeof payrollSettings === "object" && payrollSettings !== null) {
    const currentSnap = await db3().collection("organizations").doc(req.user.organizationId).get();
    const current = currentSnap.data();
    const incoming = payrollSettings;
    const merged = {
      ...DEFAULT_PAYROLL_SETTINGS,
      ...current?.payrollSettings ?? {},
      ...incoming
    };
    const day = Math.round(Number(merged.autoRunDay));
    merged.autoRunDay = Number.isFinite(day) ? Math.min(28, Math.max(1, day)) : 1;
    merged.autoRunEnabled = Boolean(merged.autoRunEnabled);
    merged.emailPayslips = Boolean(merged.emailPayslips);
    updates.payrollSettings = merged;
  }
  await db3().collection("organizations").doc(req.user.organizationId).update(updates);
  const updatedSnap = await db3().collection("organizations").doc(req.user.organizationId).get();
  const org = { id: updatedSnap.id, ...updatedSnap.data() };
  await logAction(req, "UPDATE", "organization", org.id, "Updated organization profile");
  res.json(formatOrg(org));
});
orgRouter.put("/organizations/current/modules", requireAuth, requireOwner, async (req, res) => {
  const modules = req.body;
  if (!modules || typeof modules !== "object") {
    res.status(400).json({ error: "modules object required" });
    return;
  }
  const currentSnap = await db3().collection("organizations").doc(req.user.organizationId).get();
  const current = currentSnap.data();
  const merged = { ...current?.modules, ...modules };
  await db3().collection("organizations").doc(req.user.organizationId).update({ modules: merged });
  const updatedSnap = await db3().collection("organizations").doc(req.user.organizationId).get();
  const org = { id: updatedSnap.id, ...updatedSnap.data() };
  await logAction(req, "UPDATE", "organization_modules", org.id, JSON.stringify(modules));
  res.json(formatOrg(org));
});
orgRouter.post("/organizations/current/members", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body ?? {};
    if (!name || !email || !password) {
      res.status(400).json({ error: "name, email, and password are required" });
      return;
    }
    if (!role || !["admin", "sales", "sales_executive", "viewer"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }
    if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await db3().collection("users").where("email", "==", normalizedEmail).limit(1).get();
    if (!existing.empty) {
      const existingUser = existing.docs[0];
      const existingMember = await db3().collection("organization_members").where("organizationId", "==", req.user.organizationId).where("userId", "==", existingUser.id).limit(1).get();
      if (!existingMember.empty) {
        res.status(409).json({ error: "User is already a member of this organization" });
        return;
      }
      await db3().collection("organization_members").add({
        organizationId: req.user.organizationId,
        userId: existingUser.id,
        role,
        invitedById: req.user.userId,
        joinedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      await logAction(req, "CREATE", "member", existingUser.id, `Added existing user ${normalizedEmail} as ${role}`);
      res.status(201).json({ userId: existingUser.id, email: normalizedEmail, role, message: "Existing user added to organization" });
      return;
    }
    const passwordHash = await import_bcryptjs2.default.hash(password, 10);
    const userRef = await db3().collection("users").add({
      name,
      email: normalizedEmail,
      passwordHash,
      phone: null,
      isActive: true,
      lastLogin: null,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    await db3().collection("organization_members").add({
      organizationId: req.user.organizationId,
      userId: userRef.id,
      role,
      invitedById: req.user.userId,
      joinedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    await logAction(req, "CREATE", "member", userRef.id, `Created member ${normalizedEmail} as ${role}`);
    res.status(201).json({ userId: userRef.id, email: normalizedEmail, role, message: "Member created successfully" });
  } catch (err) {
    console.error("Failed to create member:", err);
    res.status(500).json({ error: "Failed to create member" });
  }
});
orgRouter.get("/organizations/current/members", requireAuth, async (req, res) => {
  const memberSnap = await db3().collection("organization_members").where("organizationId", "==", req.user.organizationId).get();
  const members = memberSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const rows = await Promise.all(
    members.map(async (m) => {
      const userSnap = await db3().collection("users").doc(m.userId).get();
      const user = userSnap.data();
      return {
        id: m.id,
        userId: m.userId,
        name: user?.name ?? null,
        email: user?.email ?? null,
        role: m.role,
        isActive: user?.isActive ?? null,
        lastLogin: user?.lastLogin ?? null,
        joinedAt: m.joinedAt
      };
    })
  );
  res.json(
    rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.name,
      email: r.email,
      role: r.role,
      isActive: r.isActive,
      lastLogin: r.lastLogin ?? null,
      joinedAt: r.joinedAt
    }))
  );
});
orgRouter.patch(
  "/organizations/current/members/:userId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { role } = req.body ?? {};
    const targetUserId = req.params.userId;
    if (!role || !["owner", "admin", "sales", "sales_executive", "viewer"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }
    if (role === "owner" && req.user.role !== "owner") {
      res.status(403).json({ error: "Only the owner can promote to owner" });
      return;
    }
    if (targetUserId === req.user.userId && req.user.role === "owner" && role !== "owner") {
      res.status(403).json({ error: "Owner cannot self-demote. Transfer ownership first." });
      return;
    }
    const existingSnap = await db3().collection("organization_members").where("organizationId", "==", req.user.organizationId).where("userId", "==", targetUserId).get();
    if (existingSnap.empty) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    const existingDoc = existingSnap.docs[0];
    const existing = existingDoc.data();
    if (existing.role === "owner" && req.user.role !== "owner") {
      res.status(403).json({ error: "Only the owner can change the owner's role" });
      return;
    }
    await db3().collection("organization_members").doc(existingDoc.id).update({ role });
    res.json({ id: existingDoc.id, userId: targetUserId, role });
  }
);
orgRouter.delete(
  "/organizations/current/members/:userId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const targetUserId = String(req.params.userId);
    if (targetUserId === req.user.userId) {
      res.status(400).json({ error: "Cannot remove yourself. Transfer ownership first." });
      return;
    }
    const targetSnap = await db3().collection("organization_members").where("organizationId", "==", req.user.organizationId).where("userId", "==", targetUserId).get();
    if (targetSnap.empty) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    const targetDoc = targetSnap.docs[0];
    const target = targetDoc.data();
    if (target.role === "owner") {
      res.status(403).json({ error: "Cannot remove the owner" });
      return;
    }
    await db3().collection("organization_members").doc(targetDoc.id).delete();
    await logAction(req, "DELETE", "member", targetUserId, "Removed member");
    res.json({ message: "Member removed" });
  }
);
orgRouter.get("/organizations/current/invitations", requireAuth, requireAdmin, async (req, res) => {
  const snap = await db3().collection("invitations").where("organizationId", "==", req.user.organizationId).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(
    rows.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      token: i.token,
      acceptedAt: i.acceptedAt ?? null,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt
    }))
  );
});
orgRouter.post("/organizations/current/invitations", requireAuth, requireAdmin, async (req, res) => {
  const { email, role } = req.body ?? {};
  if (!email || !role) {
    res.status(400).json({ error: "email and role required" });
    return;
  }
  if (!["admin", "sales", "sales_executive", "viewer"].includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }
  const token = import_node_crypto.default.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString();
  const invData = {
    organizationId: req.user.organizationId,
    email: String(email).trim().toLowerCase(),
    role,
    token,
    invitedById: req.user.userId,
    expiresAt,
    acceptedAt: null,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const invRef = await db3().collection("invitations").add(invData);
  await logAction(req, "CREATE", "invitation", invRef.id, `Invited ${email} as ${role}`);
  res.status(201).json({
    id: invRef.id,
    email: invData.email,
    role: invData.role,
    token: invData.token,
    acceptUrl: `/accept-invite/${invData.token}`,
    expiresAt: invData.expiresAt,
    createdAt: invData.createdAt
  });
});
orgRouter.delete(
  "/organizations/current/invitations/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const invSnap = await db3().collection("invitations").where("organizationId", "==", req.user.organizationId).get();
    const invDoc = invSnap.docs.find((d) => d.id === req.params.id);
    if (invDoc) {
      await db3().collection("invitations").doc(invDoc.id).delete();
    }
    res.json({ message: "Invitation revoked" });
  }
);
orgRouter.get("/invitations/:token", async (req, res) => {
  const invSnap = await db3().collection("invitations").where("token", "==", String(req.params.token)).get();
  if (invSnap.empty) {
    res.status(404).json({ error: "Invitation not found" });
    return;
  }
  const invDoc = invSnap.docs[0];
  const inv = invDoc.data();
  const orgSnap = await db3().collection("organizations").doc(inv.organizationId).get();
  const org = orgSnap.data();
  res.json({
    email: inv.email,
    role: inv.role,
    organizationId: inv.organizationId,
    organizationName: org?.name ?? null,
    accepted: !!inv.acceptedAt,
    expired: new Date(inv.expiresAt) < /* @__PURE__ */ new Date(),
    expiresAt: inv.expiresAt
  });
});
orgRouter.post("/invitations/:token/accept", requireUser, async (req, res) => {
  const invSnap = await db3().collection("invitations").where("token", "==", String(req.params.token)).get();
  if (invSnap.empty) {
    res.status(404).json({ error: "Invitation not found" });
    return;
  }
  const invDoc = invSnap.docs[0];
  const inv = invDoc.data();
  if (inv.acceptedAt) {
    res.status(400).json({ error: "Invitation already accepted" });
    return;
  }
  if (new Date(inv.expiresAt) < /* @__PURE__ */ new Date()) {
    res.status(400).json({ error: "Invitation expired" });
    return;
  }
  if (inv.email.toLowerCase() !== req.user.email.toLowerCase()) {
    res.status(403).json({ error: "This invitation is for a different email address" });
    return;
  }
  const existingSnap = await db3().collection("organization_members").where("organizationId", "==", inv.organizationId).where("userId", "==", req.user.userId).get();
  if (existingSnap.empty) {
    await db3().collection("organization_members").add({
      organizationId: inv.organizationId,
      userId: req.user.userId,
      role: inv.role,
      invitedById: inv.invitedById ?? null,
      joinedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  await db3().collection("invitations").doc(invDoc.id).update({ acceptedAt: (/* @__PURE__ */ new Date()).toISOString() });
  const token = signToken({
    userId: req.user.userId,
    email: req.user.email,
    activeOrgId: inv.organizationId
  });
  res.json({ token, activeOrgId: inv.organizationId, role: inv.role });
});
var organizations_default = orgRouter;

// src/routes/clients.ts
var import_express4 = require("express");
var clientsRouter = (0, import_express4.Router)();
var db4 = () => getDb();
function formatClient(id, c, quotationCount = 0, totalValue = 0) {
  return {
    id,
    name: c.name,
    email: c.email ?? null,
    phone: c.phone ?? null,
    company: c.company ?? null,
    address: c.address ?? null,
    city: c.city ?? null,
    state: c.state ?? null,
    gstNumber: c.gstNumber ?? null,
    pincode: c.pincode ?? null,
    isActive: c.isActive !== false,
    notes: c.notes ?? null,
    quotationCount,
    totalValue,
    createdAt: c.createdAt
  };
}
clientsRouter.get("/clients", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const snap = await db4().collection("clients").where("organizationId", "==", orgId).get();
  const clients = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const quotSnap = await db4().collection("quotations").where("organizationId", "==", orgId).get();
  const statMap = /* @__PURE__ */ new Map();
  for (const doc of quotSnap.docs) {
    const data = doc.data();
    const clientId = data.clientId;
    const total = data.total;
    const existing = statMap.get(clientId);
    if (existing) {
      existing.count += 1;
      existing.total += total;
    } else {
      statMap.set(clientId, { count: 1, total });
    }
  }
  res.json(
    clients.map(
      (c) => formatClient(
        c.id,
        c,
        statMap.get(c.id)?.count ?? 0,
        statMap.get(c.id)?.total ?? 0
      )
    )
  );
});
clientsRouter.get("/clients/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const doc = await db4().collection("clients").doc(req.params.id).get();
  if (!doc.exists) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  const data = doc.data();
  if (data.organizationId !== orgId) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(formatClient(doc.id, data));
});
clientsRouter.post("/clients", requireAuth, async (req, res) => {
  const { name, email, phone, company, address, city, state, gstNumber, pincode, isActive, notes } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const newClient = {
    organizationId: req.user.organizationId,
    name,
    email: email ?? null,
    phone: phone ?? null,
    company: company ?? null,
    address: address ?? null,
    city: city ?? null,
    state: state ?? null,
    gstNumber: gstNumber ?? null,
    pincode: pincode ?? null,
    isActive: isActive !== false,
    notes: notes ?? null,
    createdById: req.user.userId,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const ref = await db4().collection("clients").add(newClient);
  await logAction(req, "CREATE", "client", ref.id, `Created client ${name}`);
  res.status(201).json(formatClient(ref.id, newClient));
});
clientsRouter.patch("/clients/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const updates = {};
  const fields = ["name", "email", "phone", "company", "address", "city", "state", "gstNumber", "pincode", "isActive", "notes"];
  for (const f of fields) if (req.body?.[f] !== void 0) updates[f] = req.body[f];
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const docRef = db4().collection("clients").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().organizationId !== orgId) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  await docRef.update(updates);
  const updated = (await docRef.get()).data();
  await logAction(req, "UPDATE", "client", req.params.id);
  res.json(formatClient(req.params.id, updated));
});
clientsRouter.delete("/clients/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user.organizationId;
  const docRef = db4().collection("clients").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().organizationId !== orgId) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  await docRef.delete();
  await logAction(req, "DELETE", "client", req.params.id);
  res.json({ message: "Client deleted" });
});
var clients_default = clientsRouter;

// src/routes/products.ts
var import_express5 = require("express");
var productsRouter = (0, import_express5.Router)();
var db5 = () => getDb();
function formatProduct(id, p) {
  return {
    id,
    name: p.name,
    category: p.category,
    description: p.description ?? null,
    unit: p.unit,
    basePrice: Number(p.basePrice),
    pixelPitch: p.pixelPitch ?? null,
    resolution: p.resolution ?? null,
    brightness: p.brightness ?? null,
    application: p.application ?? null,
    isActive: p.isActive,
    createdAt: p.createdAt
  };
}
productsRouter.get("/products", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const { category, isActive } = req.query;
  let snap = await db5().collection("products").where("organizationId", "==", orgId).get();
  let products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (category) products = products.filter((p) => p.category === category);
  if (isActive !== void 0) products = products.filter((p) => p.isActive === (isActive === "true"));
  res.json(products.map((p) => formatProduct(p.id, p)));
});
productsRouter.post("/products", requireAuth, requireAdmin, async (req, res) => {
  const { name, category, unit, basePrice, description, pixelPitch, resolution, brightness, application, isActive } = req.body ?? {};
  if (!name || !category || basePrice === void 0) {
    res.status(400).json({ error: "name, category, basePrice required" });
    return;
  }
  const newProduct = {
    organizationId: req.user.organizationId,
    name,
    category,
    unit: unit ?? "sqft",
    basePrice: String(basePrice),
    description: description ?? null,
    pixelPitch: pixelPitch ?? null,
    resolution: resolution ?? null,
    brightness: brightness ?? null,
    application: application ?? null,
    isActive: isActive !== false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const ref = await db5().collection("products").add(newProduct);
  await logAction(req, "CREATE", "product", ref.id, `Created product ${name}`);
  res.status(201).json(formatProduct(ref.id, newProduct));
});
productsRouter.get("/products/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const doc = await db5().collection("products").doc(req.params.id).get();
  if (!doc.exists) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const data = doc.data();
  if (data.organizationId !== orgId) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(formatProduct(doc.id, data));
});
productsRouter.patch("/products/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user.organizationId;
  const updates = {};
  const fields = [
    "name",
    "category",
    "unit",
    "description",
    "pixelPitch",
    "resolution",
    "brightness",
    "application",
    "isActive"
  ];
  for (const f of fields) if (req.body?.[f] !== void 0) updates[f] = req.body[f];
  if (req.body?.basePrice !== void 0) updates.basePrice = String(req.body.basePrice);
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const docRef = db5().collection("products").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().organizationId !== orgId) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  await docRef.update(updates);
  const updated = (await docRef.get()).data();
  await logAction(req, "UPDATE", "product", req.params.id);
  res.json(formatProduct(req.params.id, updated));
});
productsRouter.delete("/products/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user.organizationId;
  const docRef = db5().collection("products").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().organizationId !== orgId) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  await docRef.delete();
  await logAction(req, "DELETE", "product", req.params.id);
  res.json({ message: "Product deleted" });
});
var products_default = productsRouter;

// src/routes/addons.ts
var import_express6 = require("express");
var addonsRouter = (0, import_express6.Router)();
var db6 = () => getDb();
function formatAddon(id, a) {
  return {
    id,
    name: a.name,
    description: a.description ?? null,
    price: Number(a.price),
    priceType: a.priceType,
    category: a.category,
    isActive: a.isActive
  };
}
addonsRouter.get("/addons", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const snap = await db6().collection("addons").where("organizationId", "==", orgId).get();
  const addons = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  addons.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  res.json(addons.map((a) => formatAddon(a.id, a)));
});
addonsRouter.post("/addons", requireAuth, requireAdmin, async (req, res) => {
  const { name, description, price, priceType, category, isActive } = req.body ?? {};
  if (!name || price === void 0 || !priceType || !category) {
    res.status(400).json({ error: "Required fields missing" });
    return;
  }
  const newAddon = {
    organizationId: req.user.organizationId,
    name,
    description: description ?? null,
    price: String(price),
    priceType,
    category,
    isActive: isActive !== false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const ref = await db6().collection("addons").add(newAddon);
  await logAction(req, "CREATE", "addon", ref.id, `Created addon ${name}`);
  res.status(201).json(formatAddon(ref.id, newAddon));
});
addonsRouter.patch("/addons/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user.organizationId;
  const updates = {};
  const fields = ["name", "description", "priceType", "category", "isActive"];
  for (const f of fields) if (req.body?.[f] !== void 0) updates[f] = req.body[f];
  if (req.body?.price !== void 0) updates.price = String(req.body.price);
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const docRef = db6().collection("addons").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().organizationId !== orgId) {
    res.status(404).json({ error: "Addon not found" });
    return;
  }
  await docRef.update(updates);
  const updated = (await docRef.get()).data();
  await logAction(req, "UPDATE", "addon", req.params.id);
  res.json(formatAddon(req.params.id, updated));
});
addonsRouter.delete("/addons/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user.organizationId;
  const docRef = db6().collection("addons").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().organizationId !== orgId) {
    res.status(404).json({ error: "Addon not found" });
    return;
  }
  await docRef.delete();
  await logAction(req, "DELETE", "addon", req.params.id);
  res.json({ message: "Addon deleted" });
});
var addons_default = addonsRouter;

// src/routes/quotations.ts
var import_express7 = require("express");

// src/lib/recalcQuotation.ts
var import_firestore3 = require("firebase-admin/firestore");
var db7 = () => getDb();
async function recalcQuotation(quotationId) {
  const itemsSnap = await db7().collection("quotationItems").where("quotationId", "==", quotationId).get();
  const addonsSnap = await db7().collection("quotationAddons").where("quotationId", "==", quotationId).get();
  const itemsTotal = itemsSnap.docs.reduce((sum, doc) => sum + Number(doc.data().totalPrice), 0);
  const addonsTotal = addonsSnap.docs.reduce((sum, doc) => sum + Number(doc.data().totalPrice), 0);
  const subtotal = itemsTotal + addonsTotal;
  const quotSnap = await db7().collection("quotations").doc(quotationId).get();
  if (!quotSnap.exists) return;
  const quotation = quotSnap.data();
  const discountPercent = Number(quotation.discountPercent);
  const taxPercent = Number(quotation.taxPercent);
  const discountAmount = subtotal * (discountPercent / 100);
  const taxAmount = (subtotal - discountAmount) * (taxPercent / 100);
  const total = subtotal - discountAmount + taxAmount;
  await db7().collection("quotations").doc(quotationId).update({
    subtotal: subtotal.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    total: total.toFixed(2),
    updatedAt: import_firestore3.FieldValue.serverTimestamp()
  });
}

// src/routes/quotations.ts
var quotationsRouter = (0, import_express7.Router)();
var db8 = () => getDb();
function genQuotationNumber() {
  const now = /* @__PURE__ */ new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9e3) + 1e3;
  return `QT-${y}${m}-${rand}`;
}
function formatItem(item, productName, itemName) {
  return {
    id: item.id,
    quotationId: item.quotationId,
    productId: item.productId ?? null,
    productName: productName ?? null,
    itemId: item.itemId ?? null,
    itemName: itemName ?? null,
    description: item.description,
    widthFt: item.widthFt !== null && item.widthFt !== void 0 ? Number(item.widthFt) : null,
    heightFt: item.heightFt !== null && item.heightFt !== void 0 ? Number(item.heightFt) : null,
    areaSqFt: item.areaSqFt !== null && item.areaSqFt !== void 0 ? Number(item.areaSqFt) : null,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    totalPrice: Number(item.totalPrice),
    notes: item.notes ?? null
  };
}
function formatAddon2(a, addonName) {
  return {
    id: a.id,
    quotationId: a.quotationId,
    addonId: a.addonId ?? null,
    addonName: addonName ?? null,
    description: a.description,
    quantity: a.quantity,
    price: Number(a.price),
    totalPrice: Number(a.totalPrice)
  };
}
async function formatQuotation(q) {
  const clientSnap = q.clientId ? await db8().collection("clients").doc(q.clientId).get() : null;
  const client = clientSnap?.exists ? clientSnap.data() : null;
  const creatorSnap = q.createdById ? await db8().collection("users").doc(q.createdById).get() : null;
  const creator = creatorSnap?.exists ? creatorSnap.data() : null;
  const itemsSnap = await db8().collection("quotation_items").where("quotationId", "==", q.id).get();
  const itemCount = itemsSnap.size;
  return {
    id: q.id,
    quotationNumber: q.quotationNumber,
    clientId: q.clientId ?? null,
    clientName: client?.name ?? null,
    clientCompany: client?.company ?? null,
    createdByName: creator?.name ?? null,
    status: q.status,
    validUntil: q.validUntil ?? null,
    subtotal: Number(q.subtotal),
    discountAmount: Number(q.discountAmount),
    discountPercent: Number(q.discountPercent),
    taxAmount: Number(q.taxAmount),
    taxPercent: Number(q.taxPercent),
    total: Number(q.total),
    notes: q.notes ?? null,
    terms: q.terms ?? null,
    itemCount,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt
  };
}
async function loadOrgQuotation(orgId, id) {
  const snap = await db8().collection("quotations").doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (data.organizationId !== orgId) return null;
  return { id: snap.id, ...data };
}
quotationsRouter.get("/quotations", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const { status, clientId, search } = req.query;
  const FIRESTORE_HARD_CAP = 100;
  let query = db8().collection("quotations").where("organizationId", "==", orgId);
  if (status) query = query.where("status", "==", status);
  if (clientId) query = query.where("clientId", "==", String(clientId));
  const snap = await query.limit(FIRESTORE_HARD_CAP).get();
  let rows = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  if (search && typeof search === "string") {
    const s = search.toLowerCase();
    rows = rows.filter(
      (q) => (q.quotationNumber ?? "").toLowerCase().includes(s) || (q.clientId ?? "").toLowerCase().includes(s)
    );
  }
  const clientIds = [...new Set(rows.map((q) => q.clientId).filter(Boolean))];
  const creatorIds = [...new Set(rows.map((q) => q.createdById).filter(Boolean))];
  const quotationIds = rows.map((q) => q.id);
  const [clientSnaps, creatorSnaps, itemsSnaps] = await Promise.all([
    clientIds.length ? Promise.all(clientIds.map((id) => db8().collection("clients").doc(id).get())) : [],
    creatorIds.length ? Promise.all(creatorIds.map((id) => db8().collection("users").doc(id).get())) : [],
    quotationIds.length ? Promise.all(quotationIds.map((id) => db8().collection("quotation_items").where("quotationId", "==", id).limit(50).get())) : []
  ]);
  const clientMap = /* @__PURE__ */ new Map();
  clientIds.forEach((id, i) => {
    if (clientSnaps[i]?.exists) clientMap.set(id, clientSnaps[i].data());
  });
  const creatorMap = /* @__PURE__ */ new Map();
  creatorIds.forEach((id, i) => {
    if (creatorSnaps[i]?.exists) creatorMap.set(id, creatorSnaps[i].data());
  });
  const itemCountMap = /* @__PURE__ */ new Map();
  quotationIds.forEach((id, i) => {
    itemCountMap.set(id, itemsSnaps[i]?.size ?? 0);
  });
  const result = rows.map((q) => {
    const client = q.clientId ? clientMap.get(q.clientId) : null;
    const creator = q.createdById ? creatorMap.get(q.createdById) : null;
    return {
      id: q.id,
      quotationNumber: q.quotationNumber,
      clientId: q.clientId ?? null,
      clientName: client?.name ?? null,
      clientCompany: client?.company ?? null,
      createdByName: creator?.name ?? null,
      status: q.status,
      validUntil: q.validUntil ?? null,
      subtotal: Number(q.subtotal),
      discountAmount: Number(q.discountAmount),
      discountPercent: Number(q.discountPercent),
      taxAmount: Number(q.taxAmount),
      taxPercent: Number(q.taxPercent),
      total: Number(q.total),
      notes: q.notes ?? null,
      terms: q.terms ?? null,
      itemCount: itemCountMap.get(q.id) ?? 0,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt
    };
  });
  res.json(result);
});
quotationsRouter.post("/quotations", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const userId = req.user.userId;
  const { clientId, validUntil, notes, terms, discountPercent, taxPercent } = req.body ?? {};
  if (clientId) {
    const cSnap = await db8().collection("clients").doc(String(clientId)).get();
    if (!cSnap.exists || cSnap.data().organizationId !== orgId) {
      res.status(400).json({ error: "Invalid client" });
      return;
    }
  }
  const quotationNumber = genQuotationNumber();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const docRef = await db8().collection("quotations").add({
    organizationId: orgId,
    quotationNumber,
    clientId: clientId ?? null,
    createdById: userId,
    status: "draft",
    validUntil: validUntil ?? null,
    notes: notes ?? null,
    terms: terms ?? "Payment due within 30 days of invoice. Prices valid for 30 days.",
    discountPercent: String(discountPercent ?? 0),
    discountAmount: "0",
    taxPercent: String(taxPercent ?? 18),
    taxAmount: "0",
    subtotal: "0",
    total: "0",
    createdAt: now,
    updatedAt: now
  });
  const qSnap = await docRef.get();
  const q = { id: qSnap.id, ...qSnap.data() };
  await logAction(req, "CREATE", "quotation", q.id, `Created quotation ${quotationNumber}`);
  res.status(201).json(await formatQuotation(q));
});
quotationsRouter.get("/quotations/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const q = await loadOrgQuotation(orgId, id);
  if (!q) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const clientSnap = q.clientId ? await db8().collection("clients").doc(q.clientId).get() : null;
  const client = clientSnap?.exists ? clientSnap.data() : null;
  const creatorSnap = q.createdById ? await db8().collection("users").doc(q.createdById).get() : null;
  const creator = creatorSnap?.exists ? creatorSnap.data() : null;
  const itemsSnap = await db8().collection("quotation_items").where("quotationId", "==", id).get();
  const items = itemsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const addonsSnap = await db8().collection("quotation_addons").where("quotationId", "==", id).get();
  const addons = addonsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const productIds = items.map((i) => i.productId).filter(Boolean);
  const productMap = /* @__PURE__ */ new Map();
  for (const pid of productIds) {
    const pSnap = await db8().collection("products").doc(pid).get();
    if (pSnap.exists) productMap.set(pid, pSnap.data().name);
  }
  const linkedItemIds = items.map((i) => i.itemId).filter(Boolean);
  const itemMap = /* @__PURE__ */ new Map();
  for (const lid of linkedItemIds) {
    const itSnap = await db8().collection("items").doc(lid).get();
    if (itSnap.exists) itemMap.set(lid, itSnap.data().name);
  }
  const addonIds = addons.map((a) => a.addonId).filter(Boolean);
  const addonMap = /* @__PURE__ */ new Map();
  for (const aid of addonIds) {
    const aSnap = await db8().collection("addons").doc(aid).get();
    if (aSnap.exists) addonMap.set(aid, aSnap.data().name);
  }
  res.json({
    id: q.id,
    quotationNumber: q.quotationNumber,
    clientId: q.clientId ?? null,
    clientName: client?.name ?? null,
    clientCompany: client?.company ?? null,
    clientEmail: client?.email ?? null,
    clientPhone: client?.phone ?? null,
    clientAddress: client?.address ?? null,
    clientGstNumber: client?.gstNumber ?? null,
    createdByName: creator?.name ?? null,
    status: q.status,
    validUntil: q.validUntil ?? null,
    subtotal: Number(q.subtotal),
    discountAmount: Number(q.discountAmount),
    discountPercent: Number(q.discountPercent),
    taxAmount: Number(q.taxAmount),
    taxPercent: Number(q.taxPercent),
    total: Number(q.total),
    notes: q.notes ?? null,
    terms: q.terms ?? null,
    items: items.map(
      (i) => formatItem(i, productMap.get(i.productId ?? "") ?? null, itemMap.get(i.itemId ?? "") ?? null)
    ),
    quotationAddons: addons.map(
      (a) => formatAddon2(a, addonMap.get(a.addonId ?? "") ?? null)
    ),
    createdAt: q.createdAt,
    updatedAt: q.updatedAt
  });
});
quotationsRouter.patch("/quotations/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const existing = await loadOrgQuotation(orgId, id);
  if (!existing) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const { clientId, validUntil, notes, terms, discountPercent, taxPercent } = req.body ?? {};
  if (clientId !== void 0 && clientId !== null) {
    const cSnap = await db8().collection("clients").doc(String(clientId)).get();
    if (!cSnap.exists || cSnap.data().organizationId !== orgId) {
      res.status(400).json({ error: "Invalid client" });
      return;
    }
  }
  const updates = { updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  if (clientId !== void 0) updates.clientId = clientId;
  if (validUntil !== void 0) updates.validUntil = validUntil ?? null;
  if (notes !== void 0) updates.notes = notes;
  if (terms !== void 0) updates.terms = terms;
  if (discountPercent !== void 0) updates.discountPercent = String(discountPercent);
  if (taxPercent !== void 0) updates.taxPercent = String(taxPercent);
  await db8().collection("quotations").doc(id).update(updates);
  if (discountPercent !== void 0 || taxPercent !== void 0) {
    await recalcQuotation(id);
  }
  const updatedSnap = await db8().collection("quotations").doc(id).get();
  const q = { id: updatedSnap.id, ...updatedSnap.data() };
  await logAction(req, "UPDATE", "quotation", id);
  res.json(await formatQuotation(q));
});
quotationsRouter.delete("/quotations/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const existing = await loadOrgQuotation(orgId, id);
  if (!existing) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  await db8().collection("quotations").doc(id).delete();
  await logAction(req, "DELETE", "quotation", id);
  res.json({ message: "Quotation deleted" });
});
quotationsRouter.patch("/quotations/:id/status", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const { status } = req.body ?? {};
  if (!["draft", "sent", "approved", "rejected", "expired"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const existing = await loadOrgQuotation(orgId, id);
  if (!existing) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  await db8().collection("quotations").doc(id).update({ status, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  const updatedSnap = await db8().collection("quotations").doc(id).get();
  const q = { id: updatedSnap.id, ...updatedSnap.data() };
  await logAction(req, "STATUS_CHANGE", "quotation", id, `Status changed to ${status}`);
  res.json(await formatQuotation(q));
});
quotationsRouter.post("/quotations/:id/duplicate", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const userId = req.user.userId;
  const id = req.params.id;
  const original = await loadOrgQuotation(orgId, id);
  if (!original) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const itemsSnap = await db8().collection("quotation_items").where("quotationId", "==", id).get();
  const items = itemsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const addonsSnap = await db8().collection("quotation_addons").where("quotationId", "==", id).get();
  const addons = addonsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const quotationNumber = genQuotationNumber();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const newDocRef = await db8().collection("quotations").add({
    organizationId: orgId,
    quotationNumber,
    clientId: original.clientId ?? null,
    createdById: userId,
    status: "draft",
    validUntil: null,
    notes: original.notes ?? null,
    terms: original.terms ?? null,
    discountPercent: original.discountPercent,
    taxPercent: original.taxPercent,
    subtotal: original.subtotal,
    discountAmount: original.discountAmount,
    taxAmount: original.taxAmount,
    total: original.total,
    createdAt: now,
    updatedAt: now
  });
  const newQId = newDocRef.id;
  for (const i of items) {
    await db8().collection("quotation_items").add({
      quotationId: newQId,
      productId: i.productId ?? null,
      itemId: i.itemId ?? null,
      description: i.description,
      widthFt: i.widthFt ?? null,
      heightFt: i.heightFt ?? null,
      areaSqFt: i.areaSqFt ?? null,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
      notes: i.notes ?? null
    });
  }
  for (const a of addons) {
    await db8().collection("quotation_addons").add({
      quotationId: newQId,
      addonId: a.addonId ?? null,
      description: a.description,
      quantity: a.quantity,
      price: a.price,
      totalPrice: a.totalPrice
    });
  }
  const newSnap = await db8().collection("quotations").doc(newQId).get();
  const newQ = { id: newSnap.id, ...newSnap.data() };
  await logAction(req, "DUPLICATE", "quotation", newQ.id, `Duplicated from ${original.quotationNumber}`);
  res.status(201).json(await formatQuotation(newQ));
});
quotationsRouter.post("/quotations/:id/items", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const quotationId = req.params.id;
  const parent = await loadOrgQuotation(orgId, quotationId);
  if (!parent) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const { productId, itemId, description, widthFt, heightFt, quantity, unitPrice, notes } = req.body ?? {};
  if (!description || !quantity || unitPrice === void 0) {
    res.status(400).json({ error: "Required fields missing" });
    return;
  }
  if (productId) {
    const pSnap = await db8().collection("products").doc(String(productId)).get();
    if (!pSnap.exists || pSnap.data().organizationId !== orgId) {
      res.status(400).json({ error: "Invalid product" });
      return;
    }
  }
  if (itemId) {
    const itSnap = await db8().collection("items").doc(String(itemId)).get();
    if (!itSnap.exists || itSnap.data().organizationId !== orgId) {
      res.status(400).json({ error: "Invalid inventory item" });
      return;
    }
  }
  let areaSqFt = null;
  let totalPrice;
  if (widthFt && heightFt) {
    const area = Number(widthFt) * Number(heightFt);
    areaSqFt = area.toFixed(2);
    totalPrice = (area * Number(quantity) * Number(unitPrice)).toFixed(2);
  } else {
    totalPrice = (Number(quantity) * Number(unitPrice)).toFixed(2);
  }
  const docRef = await db8().collection("quotation_items").add({
    quotationId,
    productId: productId ?? null,
    itemId: itemId ?? null,
    description,
    widthFt: widthFt ? String(widthFt) : null,
    heightFt: heightFt ? String(heightFt) : null,
    areaSqFt,
    quantity: Number(quantity),
    unitPrice: String(unitPrice),
    totalPrice,
    notes: notes ?? null
  });
  const itemSnap = await docRef.get();
  const item = { id: itemSnap.id, ...itemSnap.data() };
  await recalcQuotation(quotationId);
  await logAction(req, "ADD_ITEM", "quotation", quotationId);
  let productName = null;
  if (item.productId) {
    const pSnap = await db8().collection("products").doc(item.productId).get();
    productName = pSnap.exists ? pSnap.data().name : null;
  }
  let itemName = null;
  if (item.itemId) {
    const itSnap = await db8().collection("items").doc(item.itemId).get();
    itemName = itSnap.exists ? itSnap.data().name : null;
  }
  res.status(201).json(formatItem(item, productName, itemName));
});
quotationsRouter.patch("/quotations/:id/items/:itemId", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const quotationId = req.params.id;
  const itemId = req.params.itemId;
  const parent = await loadOrgQuotation(orgId, quotationId);
  if (!parent) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const itemSnap = await db8().collection("quotation_items").doc(itemId).get();
  if (!itemSnap.exists || itemSnap.data().quotationId !== quotationId) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  const current = { id: itemSnap.id, ...itemSnap.data() };
  const { productId, itemId: linkedItemId, description, widthFt, heightFt, quantity, unitPrice, notes } = req.body ?? {};
  if (productId) {
    const pSnap = await db8().collection("products").doc(String(productId)).get();
    if (!pSnap.exists || pSnap.data().organizationId !== orgId) {
      res.status(400).json({ error: "Invalid product" });
      return;
    }
  }
  if (linkedItemId) {
    const itSnap = await db8().collection("items").doc(String(linkedItemId)).get();
    if (!itSnap.exists || itSnap.data().organizationId !== orgId) {
      res.status(400).json({ error: "Invalid inventory item" });
      return;
    }
  }
  const updates = {};
  if (productId !== void 0) updates.productId = productId;
  if (linkedItemId !== void 0) updates.itemId = linkedItemId;
  if (description !== void 0) updates.description = description;
  if (notes !== void 0) updates.notes = notes;
  const newWidth = widthFt !== void 0 ? Number(widthFt) : Number(current.widthFt ?? 0);
  const newHeight = heightFt !== void 0 ? Number(heightFt) : Number(current.heightFt ?? 0);
  const newQty = quantity !== void 0 ? Number(quantity) : current.quantity;
  const newPrice = unitPrice !== void 0 ? Number(unitPrice) : Number(current.unitPrice);
  if (widthFt !== void 0) updates.widthFt = String(widthFt);
  if (heightFt !== void 0) updates.heightFt = String(heightFt);
  if (quantity !== void 0) updates.quantity = newQty;
  if (unitPrice !== void 0) updates.unitPrice = String(newPrice);
  const hasArea = (widthFt !== void 0 || current.widthFt) && (heightFt !== void 0 || current.heightFt);
  if (hasArea && newWidth > 0 && newHeight > 0) {
    const area = newWidth * newHeight;
    updates.areaSqFt = area.toFixed(2);
    updates.totalPrice = (area * newQty * newPrice).toFixed(2);
  } else {
    updates.areaSqFt = null;
    updates.totalPrice = (newQty * newPrice).toFixed(2);
  }
  await db8().collection("quotation_items").doc(itemId).update(updates);
  const updatedItemSnap = await db8().collection("quotation_items").doc(itemId).get();
  const item = { id: updatedItemSnap.id, ...updatedItemSnap.data() };
  await recalcQuotation(quotationId);
  let productName = null;
  if (item.productId) {
    const pSnap = await db8().collection("products").doc(item.productId).get();
    productName = pSnap.exists ? pSnap.data().name : null;
  }
  let itemName = null;
  if (item.itemId) {
    const itSnap = await db8().collection("items").doc(item.itemId).get();
    itemName = itSnap.exists ? itSnap.data().name : null;
  }
  res.json(formatItem(item, productName, itemName));
});
quotationsRouter.delete("/quotations/:id/items/:itemId", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const quotationId = req.params.id;
  const itemId = req.params.itemId;
  const parent = await loadOrgQuotation(orgId, quotationId);
  if (!parent) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const itemSnap = await db8().collection("quotation_items").doc(itemId).get();
  if (!itemSnap.exists || itemSnap.data().quotationId !== quotationId) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  await db8().collection("quotation_items").doc(itemId).delete();
  await recalcQuotation(quotationId);
  res.json({ message: "Item deleted" });
});
quotationsRouter.post("/quotations/:id/addons", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const quotationId = req.params.id;
  const parent = await loadOrgQuotation(orgId, quotationId);
  if (!parent) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const { addonId, description, quantity, price } = req.body ?? {};
  if (!description || !quantity || price === void 0) {
    res.status(400).json({ error: "Required fields missing" });
    return;
  }
  if (addonId) {
    const aSnap = await db8().collection("addons").doc(String(addonId)).get();
    if (!aSnap.exists || aSnap.data().organizationId !== orgId) {
      res.status(400).json({ error: "Invalid add-on" });
      return;
    }
  }
  const totalPrice = (Number(quantity) * Number(price)).toFixed(2);
  const docRef = await db8().collection("quotation_addons").add({
    quotationId,
    addonId: addonId ?? null,
    description,
    quantity: Number(quantity),
    price: String(price),
    totalPrice
  });
  const addonSnap = await docRef.get();
  const addon = { id: addonSnap.id, ...addonSnap.data() };
  await recalcQuotation(quotationId);
  res.status(201).json(formatAddon2(addon));
});
quotationsRouter.delete("/quotations/:id/addons/:addonId", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const quotationId = req.params.id;
  const parent = await loadOrgQuotation(orgId, quotationId);
  if (!parent) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const addonSnap = await db8().collection("quotation_addons").doc(req.params.addonId).get();
  if (!addonSnap.exists || addonSnap.data().quotationId !== quotationId) {
    res.status(404).json({ error: "Addon not found" });
    return;
  }
  await db8().collection("quotation_addons").doc(req.params.addonId).delete();
  await recalcQuotation(quotationId);
  res.json({ message: "Addon removed" });
});
quotationsRouter.get("/quotations/:id/history", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const quotationId = req.params.id;
  const parent = await loadOrgQuotation(orgId, quotationId);
  if (!parent) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const snap = await db8().collection("auditLogs").where("organizationId", "==", orgId).where("entity", "==", "quotation").get();
  const logs = snap.docs.filter((d) => {
    const data = d.data();
    return String(data.entityId) === String(quotationId);
  }).map((d) => {
    const data = d.data();
    return {
      id: d.id,
      action: data.action,
      details: data.details ?? null,
      userId: data.userId ?? null,
      ipAddress: data.ipAddress ?? null,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? null
    };
  }).sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
  res.json(logs);
});
var quotations_default = quotationsRouter;

// src/routes/reports.ts
var import_express8 = require("express");
var db9 = () => getDb();
var reportsRouter = (0, import_express8.Router)();
reportsRouter.get("/reports/dashboard", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const quotationsSnap = await db9().collection("quotations").where("organizationId", "==", orgId).get();
  const allQ = quotationsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const clientsSnap = await db9().collection("clients").where("organizationId", "==", orgId).get();
  const productsSnap = await db9().collection("products").where("organizationId", "==", orgId).get();
  const totalQ = allQ.length;
  const totalC = clientsSnap.size;
  const totalP = productsSnap.size;
  const statusMap = /* @__PURE__ */ new Map();
  for (const q of allQ) {
    const st = q.status;
    const entry = statusMap.get(st) ?? { count: 0, value: 0 };
    entry.count += 1;
    entry.value += Number(q.total ?? 0);
    statusMap.set(st, entry);
  }
  const pipelineStatuses = ["draft", "sent"];
  const pipelineValue = Array.from(statusMap.entries()).filter(([s]) => pipelineStatuses.includes(s)).reduce((acc, [, v]) => acc + v.value, 0);
  const approvedValue = statusMap.get("approved")?.value ?? 0;
  const totalApproved = statusMap.get("approved")?.count ?? 0;
  const conversionRate = totalQ > 0 ? Math.round(totalApproved / totalQ * 100) : 0;
  const now = /* @__PURE__ */ new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthlyQ = allQ.filter((q) => q.createdAt >= startOfMonth);
  const monthlyQCount = monthlyQ.length;
  const monthlyQValue = monthlyQ.reduce((s, q) => s + Number(q.total ?? 0), 0);
  allQ.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  const recentRows = allQ.slice(0, 5);
  const recent = await Promise.all(
    recentRows.map(async (q) => {
      let client = null;
      if (q.clientId) {
        const cSnap = await db9().collection("clients").doc(q.clientId).get();
        if (cSnap.exists) client = cSnap.data();
      }
      let creator = null;
      if (q.createdById) {
        const uSnap = await db9().collection("users").doc(q.createdById).get();
        if (uSnap.exists) creator = uSnap.data();
      }
      const itemsSnap = await db9().collection("quotation_items").where("quotationId", "==", q.id).get();
      return {
        id: q.id,
        quotationNumber: q.quotationNumber,
        clientId: q.clientId ?? null,
        clientName: client?.name ?? null,
        clientCompany: client?.company ?? null,
        createdByName: creator?.name ?? null,
        status: q.status,
        validUntil: q.validUntil ?? null,
        subtotal: Number(q.subtotal),
        discountAmount: Number(q.discountAmount),
        discountPercent: Number(q.discountPercent),
        taxAmount: Number(q.taxAmount),
        taxPercent: Number(q.taxPercent),
        total: Number(q.total),
        notes: q.notes ?? null,
        terms: q.terms ?? null,
        itemCount: itemsSnap.size,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt
      };
    })
  );
  res.json({
    totalQuotations: totalQ,
    totalClients: totalC,
    totalProducts: totalP,
    pipelineValue,
    approvedValue,
    conversionRate,
    thisMonthQuotations: monthlyQCount,
    thisMonthValue: monthlyQValue,
    draftCount: statusMap.get("draft")?.count ?? 0,
    sentCount: statusMap.get("sent")?.count ?? 0,
    approvedCount: statusMap.get("approved")?.count ?? 0,
    rejectedCount: statusMap.get("rejected")?.count ?? 0,
    expiredCount: statusMap.get("expired")?.count ?? 0,
    recentQuotations: recent
  });
});
reportsRouter.get("/reports/monthly", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const months = [];
  const now = /* @__PURE__ */ new Date();
  const quotationsSnap = await db9().collection("quotations").where("organizationId", "==", orgId).get();
  const allQ = quotationsSnap.docs.map((d) => d.data());
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
    const all = allQ.filter((q) => q.createdAt >= start && q.createdAt < end);
    const approved = all.filter((q) => q.status === "approved");
    const MONTHS2 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    months.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      label: `${MONTHS2[d.getMonth()]} ${d.getFullYear()}`,
      quotationCount: all.length,
      totalValue: all.reduce((s, q) => s + Number(q.total ?? 0), 0),
      approvedValue: approved.reduce((s, q) => s + Number(q.total ?? 0), 0),
      approvedCount: approved.length
    });
  }
  res.json(months);
});
reportsRouter.get("/reports/top-products", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const quotationsSnap = await db9().collection("quotations").where("organizationId", "==", orgId).get();
  const quotIds = new Set(quotationsSnap.docs.map((d) => d.id));
  const qiSnap = await db9().collection("quotation_items").get();
  const qiRows = qiSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => quotIds.has(r.quotationId) && r.productId);
  const productMap = /* @__PURE__ */ new Map();
  for (const r of qiRows) {
    const pid = r.productId;
    const entry = productMap.get(pid) ?? { count: 0, totalRevenue: 0 };
    entry.count += 1;
    entry.totalRevenue += Number(r.totalPrice ?? 0);
    productMap.set(pid, entry);
  }
  const sorted = Array.from(productMap.entries()).map(([productId, v]) => ({ productId, ...v })).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10);
  const nameMap = /* @__PURE__ */ new Map();
  for (const { productId } of sorted) {
    const pSnap = await db9().collection("products").doc(productId).get();
    if (pSnap.exists) nameMap.set(productId, pSnap.data().name);
  }
  res.json(
    sorted.map((r) => ({
      productId: r.productId,
      productName: nameMap.get(r.productId) ?? "Unknown",
      count: r.count,
      totalRevenue: r.totalRevenue
    }))
  );
});
reportsRouter.get("/reports/pipeline", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const quotationsSnap = await db9().collection("quotations").where("organizationId", "==", orgId).get();
  const allQ = quotationsSnap.docs.map((d) => d.data());
  const statusMap = /* @__PURE__ */ new Map();
  for (const q of allQ) {
    const st = q.status;
    const entry = statusMap.get(st) ?? { count: 0, totalValue: 0 };
    entry.count += 1;
    entry.totalValue += Number(q.total ?? 0);
    statusMap.set(st, entry);
  }
  res.json(
    Array.from(statusMap.entries()).map(([status, v]) => ({
      status,
      count: v.count,
      totalValue: v.totalValue
    }))
  );
});
reportsRouter.get("/audit-logs", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user.organizationId;
  const limit = Number(req.query.limit ?? 50);
  const offset = Number(req.query.offset ?? 0);
  const snap = await db9().collection("audit_logs").where("organizationId", "==", orgId).get();
  const allLogs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  allLogs.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  const logs = allLogs.slice(offset, offset + limit);
  const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))];
  const userMap = /* @__PURE__ */ new Map();
  for (const uid of userIds) {
    const uSnap = await db9().collection("users").doc(uid).get();
    if (uSnap.exists) userMap.set(uid, uSnap.data().name);
  }
  res.json(
    logs.map((l) => ({
      id: l.id,
      userId: l.userId ?? null,
      userName: l.userId ? userMap.get(l.userId) ?? null : null,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId ?? null,
      details: l.details ?? null,
      ipAddress: l.ipAddress ?? null,
      createdAt: l.createdAt
    }))
  );
});
var reports_default = reportsRouter;

// src/routes/sms.ts
var import_express9 = require("express");

// src/lib/twilio.ts
var import_twilio = __toESM(require("twilio"), 1);
async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY ? "repl " + process.env.REPL_IDENTITY : process.env.WEB_REPL_RENEWAL ? "depl " + process.env.WEB_REPL_RENEWAL : null;
  if (!hostname || !xReplitToken) return null;
  const resp = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=twilio",
    { headers: { Accept: "application/json", "X-Replit-Token": xReplitToken } }
  ).then((res) => res.json());
  const settings = resp.items?.[0]?.settings;
  if (!settings?.account_sid) return null;
  return settings;
}
async function getTwilioClient() {
  const settings = await getCredentials();
  if (!settings) return null;
  const accountSid = settings.account_sid;
  const fromNumber = settings.phone_number ?? null;
  if (!fromNumber) {
    console.error("[twilio] no phone_number in connector settings");
    return null;
  }
  if (settings.api_key?.startsWith("SK") && settings.api_key_secret) {
    return {
      client: (0, import_twilio.default)(settings.api_key, settings.api_key_secret, { accountSid }),
      fromNumber
    };
  }
  const authToken = settings.auth_token || settings.api_key_secret || settings.api_key;
  if (authToken) {
    return {
      client: (0, import_twilio.default)(accountSid, authToken),
      fromNumber
    };
  }
  console.error("[twilio] unable to determine auth credentials from connector settings");
  return null;
}

// src/routes/sms.ts
var db10 = () => getDb();
var smsRouter = (0, import_express9.Router)();
smsRouter.post("/quotations/:id/send-sms", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const { phone, message } = req.body ?? {};
  if (!phone || !message) {
    res.status(400).json({ error: "phone and message are required" });
    return;
  }
  const twilio2 = await getTwilioClient();
  if (!twilio2 || !twilio2.fromNumber) {
    res.status(503).json({ error: "SMS service not configured. Please connect Twilio in the integrations panel." });
    return;
  }
  const qSnap = await db10().collection("quotations").doc(id).get();
  if (!qSnap.exists || qSnap.data().organizationId !== orgId) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  let toNumber = String(phone).trim();
  if (toNumber.startsWith("0")) toNumber = "+91" + toNumber.slice(1);
  else if (/^\d{10}$/.test(toNumber)) toNumber = "+91" + toNumber;
  else if (!toNumber.startsWith("+")) toNumber = "+91" + toNumber;
  try {
    await twilio2.client.messages.create({ body: message, from: twilio2.fromNumber, to: toNumber });
    await logAction(req, "SEND_SMS", "quotation", id, `SMS sent to ${toNumber}`);
    res.json({ message: "SMS sent successfully" });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to send SMS";
    req.log.error({ err }, "Twilio SMS error");
    res.status(500).json({ error: errorMessage });
  }
});
var sms_default = smsRouter;

// src/routes/leads.ts
var import_express10 = require("express");

// src/lib/leadScoring.ts
function scoreLead(lead) {
  let score = 30;
  const budget = lead.budget ? Number(lead.budget) : 0;
  if (budget > 1e5) score += 30;
  else if (budget > 25e3) score += 15;
  if (lead.phone) score += 15;
  if (lead.email) score += 10;
  if (lead.source === "indiamart") score += 10;
  if (lead.status === "qualified") score += 25;
  else if (lead.status === "contacted") score += 15;
  if (lead.lastContactedAt) {
    const daysSince = (Date.now() - new Date(lead.lastContactedAt).getTime()) / 864e5;
    if (daysSince < 7) score += 10;
  }
  score = Math.max(0, Math.min(100, score));
  const priority = score >= 75 ? "hot" : score >= 50 ? "warm" : "cold";
  const nextAction = priority === "hot" ? "Call within 24 hours and send a quotation" : priority === "warm" ? "Send a follow-up email within 2 days" : "Add to nurture campaign";
  return { score, priority, nextAction };
}

// src/routes/leads.ts
var db11 = () => getDb();
var leadsRouter = (0, import_express10.Router)();
function formatLead(id, l) {
  return {
    id,
    name: l.name,
    email: l.email ?? null,
    phone: l.phone ?? null,
    gstin: l.gstin ?? null,
    company: l.company ?? null,
    city: l.city ?? null,
    state: l.state ?? null,
    source: l.source ?? "manual",
    sourceBy: l.sourceBy ?? null,
    externalId: l.externalId ?? null,
    status: l.status ?? "new",
    priority: l.priority ?? "medium",
    score: l.score ?? 0,
    approxBudget: l.approxBudget ?? l.budget ?? null,
    budget: l.budget !== null && l.budget !== void 0 ? Number(l.budget) : null,
    product: l.product ?? null,
    notes: l.notes ?? null,
    nextAction: l.nextAction ?? null,
    assignedToId: l.assignedToId ?? null,
    convertedClientId: l.convertedClientId ?? null,
    lastContactedAt: l.lastContactedAt ?? null,
    createdAt: l.createdAt ?? (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: l.updatedAt ?? (/* @__PURE__ */ new Date()).toISOString()
  };
}
leadsRouter.get("/leads", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { status, priority, source, search, page: pageStr, limit: limitStr } = req.query;
    const pageSize = Math.min(Number(limitStr) || 50, 100);
    const pageNum = Math.max(Number(pageStr) || 1, 1);
    const FIRESTORE_HARD_CAP = 500;
    let query = db11().collection("leads").where("organizationId", "==", orgId);
    if (status) query = query.where("status", "==", status);
    if (priority) query = query.where("priority", "==", priority);
    if (source) query = query.where("source", "==", source);
    let snap;
    try {
      snap = await query.orderBy("createdAt", "desc").limit(FIRESTORE_HARD_CAP).get();
    } catch (err) {
      if (err?.code === 9 || err?.code === "FAILED_PRECONDITION") {
        console.warn("[leads] Missing Firestore index, falling back to unindexed query");
        const fallbackSnap = await db11().collection("leads").where("organizationId", "==", orgId).limit(FIRESTORE_HARD_CAP).get();
        let fallbackRows = fallbackSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (status) fallbackRows = fallbackRows.filter((r) => r.status === status);
        if (priority) fallbackRows = fallbackRows.filter((r) => r.priority === priority);
        if (source) fallbackRows = fallbackRows.filter((r) => r.source === source);
        fallbackRows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
        if (search) {
          const s = search.toLowerCase();
          fallbackRows = fallbackRows.filter(
            (r) => (r.name ?? "").toLowerCase().includes(s) || (r.email ?? "").toLowerCase().includes(s) || (r.company ?? "").toLowerCase().includes(s) || (r.phone ?? "").includes(s) || (r.gstin ?? "").toLowerCase().includes(s) || (r.sourceBy ?? "").toLowerCase().includes(s)
          );
        }
        const total2 = fallbackRows.length;
        const totalPages2 = Math.ceil(total2 / pageSize);
        const paged2 = fallbackRows.slice((pageNum - 1) * pageSize, pageNum * pageSize);
        res.json({ data: paged2.map((r) => formatLead(r.id, r)), total: total2, totalPages: totalPages2, page: pageNum });
        return;
      }
      throw err;
    }
    let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (r) => (r.name ?? "").toLowerCase().includes(s) || (r.email ?? "").toLowerCase().includes(s) || (r.company ?? "").toLowerCase().includes(s) || (r.phone ?? "").includes(s) || (r.gstin ?? "").toLowerCase().includes(s) || (r.sourceBy ?? "").toLowerCase().includes(s)
      );
    }
    const total = rows.length;
    const totalPages = Math.ceil(total / pageSize);
    const paged = rows.slice((pageNum - 1) * pageSize, pageNum * pageSize);
    res.json({ data: paged.map((r) => formatLead(r.id, r)), total, totalPages, page: pageNum });
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to list leads" });
  }
});
leadsRouter.post("/leads", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const body = req.body ?? {};
    if (!body.name && !body.phone) {
      res.status(400).json({ error: "name or phone required" });
      return;
    }
    const displayName = body.name || body.phone || "Unknown Lead";
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const initial = {
      organizationId: orgId,
      name: displayName,
      email: body.email ?? null,
      phone: body.phone ?? null,
      gstin: body.gstin ?? null,
      company: body.company ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      source: body.source ?? "manual",
      sourceBy: body.sourceBy ?? null,
      status: body.status ?? "new",
      budget: body.budget !== void 0 && body.budget !== null ? String(body.budget) : null,
      approxBudget: body.approxBudget ?? null,
      product: body.product ?? null,
      notes: body.notes ?? null,
      assignedToId: body.assignedToId ?? null,
      createdById: req.user.userId,
      createdAt: now,
      updatedAt: now
    };
    const sc = scoreLead({
      ...initial,
      budget: initial.budget ? Number(initial.budget) : null
    });
    const docRef = await db11().collection("leads").add({
      ...initial,
      priority: sc.priority,
      score: sc.score,
      nextAction: sc.nextAction
    });
    const lead = { id: docRef.id, ...initial, priority: sc.priority, score: sc.score, nextAction: sc.nextAction };
    await db11().collection("lead_activities").add({
      organizationId: orgId,
      leadId: docRef.id,
      type: "note",
      title: "Lead created",
      body: `Source: ${lead.source}`,
      userId: req.user.userId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    await logAction(req, "CREATE", "lead", docRef.id, `Created lead ${lead.name}`);
    res.status(201).json(formatLead(docRef.id, lead));
  } catch (err) {
    console.error("POST /leads error:", err);
    res.status(500).json({ error: err.message ?? "Failed to create lead" });
  }
});
leadsRouter.get("/leads/:id", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const id = req.params.id;
    const snap = await db11().collection("leads").doc(id).get();
    if (!snap.exists || snap.data().organizationId !== orgId) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    const l = snap.data();
    const actSnap = await db11().collection("lead_activities").where("leadId", "==", id).limit(100).get();
    const acts = actSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    acts.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    const userIds = [...new Set(acts.map((a) => a.userId).filter(Boolean))];
    const userMap = {};
    if (userIds.length > 0) {
      const userSnaps = await Promise.all(userIds.map((uid) => db11().collection("users").doc(uid).get()));
      userIds.forEach((uid, i) => {
        if (userSnaps[i].exists) userMap[uid] = userSnaps[i].data().name;
      });
    }
    res.json({
      ...formatLead(id, l),
      activities: acts.map((a) => ({
        id: a.id,
        leadId: a.leadId,
        type: a.type,
        title: a.title,
        body: a.body ?? null,
        userId: a.userId ?? null,
        userName: a.userId ? userMap[a.userId] ?? null : null,
        createdAt: a.createdAt ?? (/* @__PURE__ */ new Date()).toISOString()
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to get lead" });
  }
});
leadsRouter.patch("/leads/:id", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const id = req.params.id;
    const existingSnap = await db11().collection("leads").doc(id).get();
    if (!existingSnap.exists || existingSnap.data().organizationId !== orgId) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    const updates = { updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    const body = req.body ?? {};
    for (const f of [
      "name",
      "email",
      "phone",
      "gstin",
      "company",
      "city",
      "state",
      "source",
      "sourceBy",
      "status",
      "product",
      "notes",
      "nextAction",
      "assignedToId"
    ]) {
      if (body[f] !== void 0) updates[f] = body[f];
    }
    if (body.budget !== void 0) updates.budget = body.budget !== null ? String(body.budget) : null;
    if (body.approxBudget !== void 0) updates.approxBudget = body.approxBudget;
    if (body.priority) updates.priority = body.priority;
    if (body.status && body.status !== "new") updates.lastContactedAt = (/* @__PURE__ */ new Date()).toISOString();
    await db11().collection("leads").doc(id).update(updates);
    const updatedSnap = await db11().collection("leads").doc(id).get();
    const l = { id: updatedSnap.id, ...updatedSnap.data() };
    const sc = scoreLead({ ...l, budget: l.budget ? Number(l.budget) : null });
    await db11().collection("leads").doc(id).update({
      priority: sc.priority,
      score: sc.score,
      nextAction: sc.nextAction
    });
    const finalSnap = await db11().collection("leads").doc(id).get();
    const final = { id: finalSnap.id, ...finalSnap.data() };
    await logAction(req, "UPDATE", "lead", id);
    res.json(formatLead(id, final));
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to update lead" });
  }
});
leadsRouter.delete("/leads/:id", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const id = req.params.id;
    const snap = await db11().collection("leads").doc(id).get();
    if (!snap.exists || snap.data().organizationId !== orgId) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    await db11().collection("leads").doc(id).delete();
    await logAction(req, "DELETE", "lead", id);
    res.json({ message: "Lead deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to delete lead" });
  }
});
leadsRouter.get("/leads/:id/activities", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const id = req.params.id;
    const leadSnap = await db11().collection("leads").doc(id).get();
    if (!leadSnap.exists || leadSnap.data().organizationId !== orgId) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    const actSnap = await db11().collection("lead_activities").where("leadId", "==", id).limit(100).get();
    const acts = actSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    acts.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    const userIds = [...new Set(acts.map((a) => a.userId).filter(Boolean))];
    const userMap = {};
    if (userIds.length > 0) {
      const userSnaps = await Promise.all(userIds.map((uid) => db11().collection("users").doc(uid).get()));
      userIds.forEach((uid, i) => {
        if (userSnaps[i].exists) userMap[uid] = userSnaps[i].data().name;
      });
    }
    res.json(
      acts.map((a) => ({
        id: a.id,
        leadId: a.leadId,
        type: a.type,
        title: a.title,
        body: a.body ?? null,
        userId: a.userId ?? null,
        userName: a.userId ? userMap[a.userId] ?? null : null,
        createdAt: a.createdAt ?? (/* @__PURE__ */ new Date()).toISOString()
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to list activities" });
  }
});
leadsRouter.post("/leads/:id/activities", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const id = req.params.id;
    const leadSnap = await db11().collection("leads").doc(id).get();
    if (!leadSnap.exists || leadSnap.data().organizationId !== orgId) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    const l = leadSnap.data();
    const { type, title, body } = req.body ?? {};
    if (!type || !title) {
      res.status(400).json({ error: "type and title required" });
      return;
    }
    const actRef = await db11().collection("lead_activities").add({
      organizationId: orgId,
      leadId: id,
      type,
      title,
      body: body ?? null,
      userId: req.user.userId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (type === "call" || type === "email") {
      await db11().collection("leads").doc(id).update({
        lastContactedAt: (/* @__PURE__ */ new Date()).toISOString(),
        status: l.status === "new" ? "contacted" : l.status
      });
    }
    res.status(201).json({
      id: actRef.id,
      leadId: id,
      type,
      title,
      body: body ?? null,
      userId: req.user.userId,
      userName: null,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to add activity" });
  }
});
leadsRouter.post("/leads/:id/score", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const id = req.params.id;
    const snap = await db11().collection("leads").doc(id).get();
    if (!snap.exists || snap.data().organizationId !== orgId) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    const l = { id: snap.id, ...snap.data() };
    const sc = scoreLead({ ...l, budget: l.budget ? Number(l.budget) : null });
    await db11().collection("leads").doc(id).update({
      score: sc.score,
      priority: sc.priority,
      nextAction: sc.nextAction,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const updatedSnap = await db11().collection("leads").doc(id).get();
    const updated = { id: updatedSnap.id, ...updatedSnap.data() };
    res.json(formatLead(id, updated));
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to score lead" });
  }
});
leadsRouter.post("/leads/:id/convert", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const id = req.params.id;
    const snap = await db11().collection("leads").doc(id).get();
    if (!snap.exists || snap.data().organizationId !== orgId) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    const l = snap.data();
    let clientId = l.convertedClientId ?? null;
    if (!clientId) {
      const clientRef = await db11().collection("clients").add({
        organizationId: orgId,
        name: l.name,
        email: l.email,
        phone: l.phone,
        company: l.company,
        city: l.city,
        state: l.state,
        notes: l.notes,
        createdById: req.user.userId,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      clientId = clientRef.id;
      await db11().collection("leads").doc(id).update({
        convertedClientId: clientId,
        status: "won",
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    let quotationId = null;
    if (req.body?.createQuotation) {
      const now = /* @__PURE__ */ new Date();
      const qn = `QT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9e3) + 1e3}`;
      const qRef = await db11().collection("quotations").add({
        organizationId: orgId,
        quotationNumber: qn,
        clientId,
        createdById: req.user.userId,
        notes: `Converted from lead #${id}`,
        taxPercent: "18",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      quotationId = qRef.id;
    }
    await db11().collection("lead_activities").add({
      organizationId: orgId,
      leadId: id,
      type: "conversion",
      title: "Converted to client",
      body: quotationId ? `Quotation #${quotationId} created` : void 0,
      userId: req.user.userId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    await logAction(req, "CONVERT", "lead", id, `Converted to client ${clientId}`);
    res.json({ clientId, quotationId });
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to convert lead" });
  }
});
leadsRouter.use((err, _req, res, _next) => {
  res.status(500).json({ error: err.message });
});
var leads_default = leadsRouter;

// src/routes/tasks.ts
var import_express11 = require("express");
var db12 = () => getDb();
var tasksRouter = (0, import_express11.Router)();
function fmt(t, assignedToName) {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    status: t.status ?? "open",
    priority: t.priority ?? "medium",
    dueAt: t.dueAt ?? null,
    relatedType: t.relatedType ?? "none",
    relatedId: t.relatedId ?? null,
    assignedToId: t.assignedToId ?? null,
    assignedToName,
    completedAt: t.completedAt ?? null,
    createdAt: t.createdAt ?? (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: t.updatedAt ?? (/* @__PURE__ */ new Date()).toISOString()
  };
}
tasksRouter.get("/tasks", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const { status, dueWithinDays } = req.query;
  const FIRESTORE_HARD_CAP = 200;
  let query = db12().collection("tasks").where("organizationId", "==", orgId);
  if (status) query = query.where("status", "==", status);
  const snap = await query.limit(FIRESTORE_HARD_CAP).get();
  let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const assignedIds = [...new Set(rows.map((r) => r.assignedToId).filter(Boolean))];
  const userMap = {};
  if (assignedIds.length > 0) {
    const userSnaps = await Promise.all(assignedIds.map((uid) => db12().collection("users").doc(uid).get()));
    assignedIds.forEach((uid, i) => {
      if (userSnaps[i].exists) userMap[uid] = userSnaps[i].data().name;
    });
  }
  rows.sort((a, b) => {
    if (!a.dueAt && !b.dueAt) return (b.createdAt || "").localeCompare(a.createdAt || "");
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    const da = new Date(a.dueAt).getTime();
    const db210 = new Date(b.dueAt).getTime();
    if (da !== db210) return da - db210;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
  let result = rows.map((r) => fmt(r, r.assignedToId ? userMap[r.assignedToId] ?? null : null));
  if (dueWithinDays) {
    const days = Number(dueWithinDays);
    const cutoff = Date.now() + days * 864e5;
    result = result.filter((r) => r.dueAt && new Date(r.dueAt).getTime() <= cutoff);
  }
  res.json(result);
});
tasksRouter.post("/tasks", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const b = req.body ?? {};
  if (!b.title) {
    res.status(400).json({ error: "title required" });
    return;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const docRef = await db12().collection("tasks").add({
    organizationId: orgId,
    title: b.title,
    description: b.description ?? null,
    status: b.status ?? "open",
    priority: b.priority ?? "medium",
    dueAt: b.dueAt ? new Date(b.dueAt).toISOString() : null,
    relatedType: b.relatedType ?? "none",
    relatedId: b.relatedId ?? null,
    assignedToId: b.assignedToId ?? req.user.userId,
    createdById: req.user.userId,
    createdAt: now,
    updatedAt: now
  });
  await logAction(req, "CREATE", "task", docRef.id);
  res.status(201).json(fmt({ id: docRef.id, createdAt: now, updatedAt: now }, null));
});
tasksRouter.patch("/tasks/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const existingSnap = await db12().collection("tasks").doc(id).get();
  if (!existingSnap.exists || existingSnap.data().organizationId !== orgId) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const b = req.body ?? {};
  const updates = { updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  for (const f of ["title", "description", "status", "priority", "relatedType", "relatedId", "assignedToId"]) {
    if (b[f] !== void 0) updates[f] = b[f];
  }
  if (b.dueAt !== void 0) updates.dueAt = b.dueAt ? new Date(b.dueAt).toISOString() : null;
  if (b.status === "done") updates.completedAt = (/* @__PURE__ */ new Date()).toISOString();
  await db12().collection("tasks").doc(id).update(updates);
  const updatedSnap = await db12().collection("tasks").doc(id).get();
  const t = { id: updatedSnap.id, ...updatedSnap.data() };
  let assignedToName = null;
  if (t.assignedToId) {
    const userSnap = await db12().collection("users").doc(t.assignedToId).get();
    if (userSnap.exists) assignedToName = userSnap.data().name;
  }
  res.json(fmt(t, assignedToName));
});
tasksRouter.delete("/tasks/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const snap = await db12().collection("tasks").doc(id).get();
  if (!snap.exists || snap.data().organizationId !== orgId) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  await db12().collection("tasks").doc(id).delete();
  res.json({ message: "Task deleted" });
});
var tasks_default = tasksRouter;

// src/routes/calls.ts
var import_express12 = require("express");

// src/lib/integrations-anthropic-ai/client.ts
var import_sdk = __toESM(require("@anthropic-ai/sdk"), 1);
var _anthropic = null;
function getAnthropic() {
  if (_anthropic) return _anthropic;
  const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  if (!baseURL || !apiKey) {
    throw new Error(
      "AI_INTEGRATIONS_ANTHROPIC_BASE_URL and AI_INTEGRATIONS_ANTHROPIC_API_KEY must be set"
    );
  }
  _anthropic = new import_sdk.default({ apiKey, baseURL });
  return _anthropic;
}

// src/lib/integrations-anthropic-ai/batch/utils.ts
var import_p_limit = __toESM(require("p-limit"), 1);
var import_p_retry = __toESM(require("p-retry"), 1);

// src/routes/calls.ts
var db13 = () => getDb();
var callsRouter = (0, import_express12.Router)();
function fmt2(c, leadName, userName) {
  return {
    id: c.id,
    leadId: c.leadId ?? null,
    leadName,
    userId: c.userId ?? null,
    userName,
    direction: c.direction,
    fromNumber: c.fromNumber ?? null,
    toNumber: c.toNumber,
    status: c.status,
    twilioSid: c.twilioSid ?? null,
    durationSec: c.durationSec ?? null,
    recordingUrl: c.recordingUrl ?? null,
    transcript: c.transcript ?? null,
    aiSummary: c.aiSummary ?? null,
    notes: c.notes ?? null,
    startedAt: c.startedAt ?? null,
    endedAt: c.endedAt ?? null,
    createdAt: c.createdAt ?? (/* @__PURE__ */ new Date()).toISOString()
  };
}
function normalizePhone(p) {
  let n = p.replace(/[^\d+]/g, "");
  if (n.startsWith("0")) n = n.slice(1);
  if (!n.startsWith("+")) n = "+91" + n;
  return n;
}
callsRouter.get("/calls", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const leadIdQ = req.query.leadId ? String(req.query.leadId) : null;
  const snap = await db13().collection("calls").where("organizationId", "==", orgId).get();
  let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const leadIds = [...new Set(rows.map((r) => r.leadId).filter(Boolean))];
  const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))];
  const leadMap = {};
  const userMap = {};
  for (const lid of leadIds) {
    const leadSnap = await db13().collection("leads").doc(lid).get();
    if (leadSnap.exists) leadMap[lid] = leadSnap.data().name;
  }
  for (const uid of userIds) {
    const userSnap = await db13().collection("users").doc(uid).get();
    if (userSnap.exists) userMap[uid] = userSnap.data().name;
  }
  let result = rows.map((r) => fmt2(r, r.leadId ? leadMap[r.leadId] ?? null : null, r.userId ? userMap[r.userId] ?? null : null));
  if (leadIdQ) result = result.filter((c) => c.leadId === leadIdQ);
  res.json(result);
});
callsRouter.post("/calls/initiate", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const { toNumber, agentNumber, leadId } = req.body ?? {};
  if (!toNumber || !agentNumber) {
    res.status(400).json({ error: "toNumber and agentNumber required" });
    return;
  }
  const to = normalizePhone(toNumber);
  const agent = normalizePhone(agentNumber);
  const twilio2 = await getTwilioClient();
  let twilioSid = null;
  let status = "queued";
  if (twilio2) {
    try {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Connecting you to your customer.</Say><Dial>${to}</Dial></Response>`;
      const call = await twilio2.client.calls.create({
        from: twilio2.fromNumber,
        to: agent,
        twiml
      });
      twilioSid = call.sid;
      status = "ringing";
    } catch (e) {
      status = "failed";
      const docRef2 = await db13().collection("calls").add({
        organizationId: orgId,
        leadId: leadId ?? null,
        userId: req.user.userId,
        direction: "outbound",
        fromNumber: agent,
        toNumber: to,
        status,
        notes: `Twilio error: ${e.message}`,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      res.status(502).json(fmt2({ id: docRef2.id, status }, null, null));
      return;
    }
  } else {
    status = "failed";
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const docRef = await db13().collection("calls").add({
    organizationId: orgId,
    leadId: leadId ?? null,
    userId: req.user.userId,
    direction: "outbound",
    fromNumber: agent,
    toNumber: to,
    status,
    twilioSid,
    startedAt: now,
    notes: !twilio2 ? "Twilio integration not configured" : null,
    createdAt: now
  });
  if (leadId) {
    await db13().collection("lead_activities").add({
      organizationId: orgId,
      leadId,
      type: "call",
      title: `Call initiated to ${to}`,
      userId: req.user.userId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    await db13().collection("leads").doc(leadId).update({
      lastContactedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  await logAction(req, "INITIATE_CALL", "call", docRef.id, twilio2 ? `Twilio SID ${twilioSid}` : "twilio unavailable");
  res.status(201).json(fmt2({ id: docRef.id, startedAt: now, status }, null, null));
});
callsRouter.patch("/calls/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const existingSnap = await db13().collection("calls").doc(id).get();
  if (!existingSnap.exists || existingSnap.data().organizationId !== orgId) {
    res.status(404).json({ error: "Call not found" });
    return;
  }
  const updates = {};
  for (const f of ["notes", "transcript", "status"]) {
    if (req.body?.[f] !== void 0) updates[f] = req.body[f];
  }
  if (req.body?.durationSec !== void 0) {
    updates.durationSec = Number(req.body.durationSec);
    updates.endedAt = (/* @__PURE__ */ new Date()).toISOString();
  }
  await db13().collection("calls").doc(id).update(updates);
  const updatedSnap = await db13().collection("calls").doc(id).get();
  const c = { id: updatedSnap.id, ...updatedSnap.data() };
  res.json(fmt2(c, null, null));
});
callsRouter.post("/calls/:id/summarize", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const snap = await db13().collection("calls").doc(id).get();
  if (!snap.exists || snap.data().organizationId !== orgId) {
    res.status(404).json({ error: "Call not found" });
    return;
  }
  const c = snap.data();
  const transcript = c.transcript || c.notes;
  if (!transcript) {
    res.status(400).json({ error: "No transcript or notes to summarize" });
    return;
  }
  try {
    const msg = await getAnthropic().messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `Summarize this sales call in 3 short bullet points (key topic, customer interest, next step). Transcript:

${transcript}`
        }
      ]
    });
    const summary = msg.content[0]?.type === "text" ? msg.content[0].text : "";
    await db13().collection("calls").doc(id).update({ aiSummary: summary });
    const updatedSnap = await db13().collection("calls").doc(id).get();
    const updated = { id: updatedSnap.id, ...updatedSnap.data() };
    res.json(fmt2(updated, null, null));
  } catch (e) {
    res.status(502).json({ error: "AI summary failed: " + e.message });
  }
});
var calls_default = callsRouter;

// src/routes/emails.ts
var import_express13 = require("express");
var db14 = () => getDb();
var emailsRouter = (0, import_express13.Router)();
function fmt3(e) {
  return {
    id: e.id,
    leadId: e.leadId ?? null,
    clientId: e.clientId ?? null,
    direction: e.direction,
    fromEmail: e.fromEmail,
    toEmail: e.toEmail,
    subject: e.subject,
    body: e.body,
    status: e.status,
    threadId: e.threadId ?? null,
    openedAt: e.openedAt ?? null,
    clickedAt: e.clickedAt ?? null,
    sentAt: e.sentAt ?? null,
    createdAt: e.createdAt ?? (/* @__PURE__ */ new Date()).toISOString()
  };
}
emailsRouter.get("/emails", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const leadId = req.query.leadId ? String(req.query.leadId) : null;
  const clientId = req.query.clientId ? String(req.query.clientId) : null;
  const snap = await db14().collection("emails").where("organizationId", "==", orgId).get();
  let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  if (leadId) rows = rows.filter((r) => r.leadId === leadId);
  if (clientId) rows = rows.filter((r) => r.clientId === clientId);
  res.json(rows.map(fmt3));
});
emailsRouter.post("/emails", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const { toEmail, subject, body, leadId, clientId, threadId } = req.body ?? {};
  if (!toEmail || !subject || !body) {
    res.status(400).json({ error: "toEmail, subject, body required" });
    return;
  }
  const fromEmail = req.user.email;
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@msme-pro>`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const docRef = await db14().collection("emails").add({
    organizationId: orgId,
    leadId: leadId ?? null,
    clientId: clientId ?? null,
    userId: req.user.userId,
    direction: "outbound",
    fromEmail,
    toEmail,
    subject,
    body,
    status: "sent",
    messageId,
    threadId: threadId ?? messageId,
    sentAt: now,
    createdAt: now
  });
  if (leadId) {
    await db14().collection("lead_activities").add({
      organizationId: orgId,
      leadId,
      type: "email",
      title: `Sent: ${subject}`,
      body,
      userId: req.user.userId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    await db14().collection("leads").doc(leadId).update({
      lastContactedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  await logAction(req, "SEND_EMAIL", "email", docRef.id, `To ${toEmail}`);
  res.status(201).json(fmt3({ id: docRef.id, fromEmail, toEmail, subject, body, status: "sent", messageId, threadId: threadId ?? messageId, sentAt: now, createdAt: now, leadId: leadId ?? null, clientId: clientId ?? null, direction: "outbound" }));
});
emailsRouter.post("/emails/draft", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const { purpose, leadId, clientId, tone } = req.body ?? {};
  if (!purpose) {
    res.status(400).json({ error: "purpose required" });
    return;
  }
  let context = "";
  if (leadId) {
    const leadSnap = await db14().collection("leads").doc(String(leadId)).get();
    if (leadSnap.exists) {
      const l = leadSnap.data();
      if (l.organizationId === orgId) {
        context = `Recipient is a lead: ${l.name}${l.company ? " from " + l.company : ""}. Source: ${l.source}. Product interest: ${l.product ?? "unspecified"}.`;
      }
    }
  } else if (clientId) {
    const clientSnap = await db14().collection("clients").doc(String(clientId)).get();
    if (clientSnap.exists) {
      const c = clientSnap.data();
      if (c.organizationId === orgId) {
        context = `Recipient is a client: ${c.name}${c.company ? " from " + c.company : ""}.`;
      }
    }
  }
  const toneText = tone ?? "friendly";
  try {
    const msg = await getAnthropic().messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `You are an Indian MSME sales rep. Draft a ${toneText} business email in English. Keep it under 150 words. Return as JSON with keys "subject" and "body" only (no markdown fences).

Context: ${context}

Purpose: ${purpose}`
        }
      ]
    });
    const text = msg.content[0]?.type === "text" ? msg.content[0].text : "";
    let subject = "Following up";
    let bodyText = text;
    try {
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
        if (parsed.subject) subject = parsed.subject;
        if (parsed.body) bodyText = parsed.body;
      }
    } catch {
    }
    res.json({ subject, body: bodyText });
  } catch (e) {
    res.status(502).json({ error: "AI draft failed: " + e.message });
  }
});
emailsRouter.get("/emails/track/open/:id", async (req, res) => {
  const id = req.params.id;
  if (id) {
    const snap = await db14().collection("emails").doc(id).get();
    if (snap.exists && !snap.data().openedAt) {
      await db14().collection("emails").doc(id).update({
        status: "opened",
        openedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "no-store");
  res.end(gif);
});
var emails_default = emailsRouter;

// src/routes/campaigns.ts
var import_express14 = require("express");
var db15 = () => getDb();
var campaignsRouter = (0, import_express14.Router)();
function fmt4(c) {
  return {
    id: c.id,
    name: c.name,
    subject: c.subject,
    body: c.body,
    fromEmail: c.fromEmail,
    segment: c.segment,
    status: c.status,
    scheduledAt: c.scheduledAt ?? null,
    sentAt: c.sentAt ?? null,
    stats: c.stats ?? { total: 0, sent: 0, opened: 0, clicked: 0 },
    subjectB: c.subjectB ?? null,
    bodyB: c.bodyB ?? null,
    abEnabled: Boolean(c.abEnabled),
    abSplitPercent: Number(c.abSplitPercent ?? 50),
    winnerVariant: c.winnerVariant ?? null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt
  };
}
campaignsRouter.get("/campaigns", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const snap = await db15().collection("campaigns").where("organizationId", "==", orgId).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  res.json(rows.map(fmt4));
});
campaignsRouter.post("/campaigns", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const b = req.body ?? {};
  if (!b.name || !b.subject || !b.body || !b.fromEmail || !b.segment) {
    res.status(400).json({ error: "name, subject, body, fromEmail, segment required" });
    return;
  }
  const ref = await db15().collection("campaigns").add({
    organizationId: orgId,
    name: b.name,
    subject: b.subject,
    body: b.body,
    fromEmail: b.fromEmail,
    segment: b.segment,
    status: b.scheduledAt ? "scheduled" : "draft",
    scheduledAt: b.scheduledAt ? new Date(b.scheduledAt).toISOString() : null,
    subjectB: b.subjectB ?? null,
    bodyB: b.bodyB ?? null,
    abEnabled: Boolean(b.abEnabled),
    abSplitPercent: b.abSplitPercent != null ? Number(b.abSplitPercent) : 50,
    createdById: req.user.userId,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  const snap = await ref.get();
  const c = { id: snap.id, ...snap.data() };
  await logAction(req, "CREATE", "campaign", ref.id);
  res.status(201).json(fmt4(c));
});
campaignsRouter.get("/campaigns/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const docSnap = await db15().collection("campaigns").doc(id).get();
  if (!docSnap.exists || docSnap.data().organizationId !== orgId) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  const c = { id: docSnap.id, ...docSnap.data() };
  const recsSnap = await db15().collection("campaign_recipients").where("campaignId", "==", id).get();
  const recs = recsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  recs.sort((a, b) => (b.id ?? "").localeCompare(a.id ?? ""));
  res.json({
    ...fmt4(c),
    recipients: recs.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name ?? null,
      leadId: r.leadId ?? null,
      clientId: r.clientId ?? null,
      status: r.status,
      sentAt: r.sentAt ?? null,
      openedAt: r.openedAt ?? null,
      clickedAt: r.clickedAt ?? null
    }))
  });
});
campaignsRouter.patch("/campaigns/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const docSnap = await db15().collection("campaigns").doc(id).get();
  if (!docSnap.exists || docSnap.data().organizationId !== orgId) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  const updates = { updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  for (const f of ["name", "subject", "body", "fromEmail", "segment", "subjectB", "bodyB", "abEnabled", "abSplitPercent", "winnerVariant"]) {
    if (req.body?.[f] !== void 0) updates[f] = req.body[f];
  }
  if (req.body?.scheduledAt !== void 0) updates.scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt).toISOString() : null;
  await db15().collection("campaigns").doc(id).update(updates);
  const updatedSnap = await db15().collection("campaigns").doc(id).get();
  const c = { id: updatedSnap.id, ...updatedSnap.data() };
  res.json(fmt4(c));
});
campaignsRouter.post("/campaigns/:id/send", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const docSnap = await db15().collection("campaigns").doc(id).get();
  if (!docSnap.exists || docSnap.data().organizationId !== orgId) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  const cData = docSnap.data();
  const c = { id: docSnap.id, ...cData };
  const entity = cData.segment?.entity ?? "leads";
  const filters = cData.segment?.filters ?? {};
  let recipients = [];
  if (entity === "leads") {
    const leadsSnap = await db15().collection("leads").where("organizationId", "==", orgId).get();
    recipients = leadsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => filters.status ? r.status === filters.status : true).filter((r) => filters.priority ? r.priority === filters.priority : true).filter((r) => !!r.email).map((r) => ({ email: r.email, name: r.name, leadId: r.id, clientId: null }));
  } else {
    const clientsSnap = await db15().collection("clients").where("organizationId", "==", orgId).get();
    recipients = clientsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => !!r.email).map((r) => ({ email: r.email, name: r.name, leadId: null, clientId: r.id }));
  }
  const suppSnap = await db15().collection("email_suppressions").where("organizationId", "==", orgId).get();
  const suppressedSet = new Set(suppSnap.docs.map((d) => d.data().email.toLowerCase()));
  recipients = recipients.filter((r) => !suppressedSet.has(r.email.toLowerCase()));
  const abEnabled = Boolean(cData.abEnabled) && cData.subjectB;
  const splitPct = Math.max(0, Math.min(100, Number(cData.abSplitPercent ?? 50)));
  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    const variant = abEnabled && i * 100 / Math.max(1, recipients.length) >= splitPct ? "b" : "a";
    const useSubject = variant === "b" && cData.subjectB ? cData.subjectB : cData.subject;
    const useBody = variant === "b" && cData.bodyB ? cData.bodyB : cData.body;
    const recRef = await db15().collection("campaign_recipients").add({
      campaignId: id,
      organizationId: orgId,
      email: r.email,
      name: r.name,
      leadId: r.leadId,
      clientId: r.clientId,
      status: "sent",
      variant: abEnabled ? variant : null,
      sentAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    await db15().collection("emails").add({
      organizationId: orgId,
      leadId: r.leadId,
      clientId: r.clientId,
      userId: req.user.userId,
      direction: "outbound",
      fromEmail: cData.fromEmail,
      toEmail: r.email,
      subject: useSubject,
      body: useBody,
      status: "sent",
      sentAt: (/* @__PURE__ */ new Date()).toISOString(),
      messageId: `<campaign-${id}-rec-${recRef.id}@msme-pro>`,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  await db15().collection("campaigns").doc(id).update({
    status: "sent",
    sentAt: (/* @__PURE__ */ new Date()).toISOString(),
    stats: { total: recipients.length, sent: recipients.length, opened: 0, clicked: 0 },
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  const updatedSnap = await db15().collection("campaigns").doc(id).get();
  const updated = { id: updatedSnap.id, ...updatedSnap.data() };
  await logAction(req, "SEND_CAMPAIGN", "campaign", id, `Sent to ${recipients.length}`);
  res.json(fmt4(updated));
});
var campaigns_default = campaignsRouter;

// src/routes/sales-orders.ts
var import_express15 = require("express");

// src/lib/stockEngine.ts
var import_firestore4 = require("firebase-admin/firestore");
var db16 = () => getDb();
async function getStockLevel(organizationId, itemId, warehouseId, executor) {
  let query = db16().collection("stockMovements").where("organizationId", "==", organizationId).where("itemId", "==", itemId);
  if (warehouseId) {
    query = query.where("warehouseId", "==", warehouseId);
  }
  const snap = await query.get();
  let qty = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const movementQty = Number(data.quantity);
    qty += data.direction === "in" ? movementQty : -movementQty;
  }
  return qty;
}
async function recordMovement(input) {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error("Movement quantity must be a positive number");
  }
  if (!input.executor) {
    return db16().runTransaction((tx) => recordMovementInTx({ ...input, executor: tx }));
  }
  return recordMovementInTx(input);
}
async function recordMovementInTx(input) {
  const tx = input.executor;
  const itemSnap = await db16().collection("items").where("id", "==", input.itemId).where("organizationId", "==", input.organizationId).limit(1).get();
  if (itemSnap.empty) throw new Error("Item not found");
  const itemDoc = itemSnap.docs[0];
  const item = itemDoc.data();
  const warehouseSnap = await db16().collection("warehouses").where("id", "==", input.warehouseId).where("organizationId", "==", input.organizationId).limit(1).get();
  if (warehouseSnap.empty) throw new Error("Warehouse not found");
  const unitCost = input.unitCost ?? Number(item.avgCost);
  const movementRef = db16().collection("stockMovements").doc();
  tx.set(movementRef, {
    organizationId: input.organizationId,
    itemId: input.itemId,
    warehouseId: input.warehouseId,
    direction: input.direction,
    quantity: String(input.quantity),
    unitCost: String(unitCost),
    reason: input.reason,
    referenceType: input.referenceType ?? null,
    referenceId: input.referenceId ?? null,
    notes: input.notes ?? null,
    createdById: input.createdById ?? null,
    createdAt: import_firestore4.FieldValue.serverTimestamp(),
    updatedAt: import_firestore4.FieldValue.serverTimestamp()
  });
  if (input.direction === "in" && unitCost > 0) {
    const prevSnap = await db16().collection("stockMovements").where("organizationId", "==", input.organizationId).where("itemId", "==", input.itemId).get();
    let currentQty = 0;
    for (const doc of prevSnap.docs) {
      if (doc.id === movementRef.id) continue;
      const d = doc.data();
      const qty = Number(d.quantity);
      currentQty += d.direction === "in" ? qty : -qty;
    }
    const currentAvg = Number(item.avgCost);
    const newQty = currentQty + input.quantity;
    const newAvg = newQty > 0 ? (currentQty * currentAvg + input.quantity * unitCost) / newQty : unitCost;
    tx.update(itemDoc.ref, {
      avgCost: newAvg.toFixed(4),
      updatedAt: import_firestore4.FieldValue.serverTimestamp()
    });
  }
  return { id: movementRef.id };
}
async function getReservedStock(organizationId, itemId, warehouseId, excludeSalesOrderId, executor) {
  let query = db16().collection("stockReservations").where("organizationId", "==", organizationId).where("itemId", "==", itemId).where("warehouseId", "==", warehouseId);
  if (excludeSalesOrderId !== void 0) {
    query = query.where("salesOrderId", "!=", excludeSalesOrderId);
  }
  const snap = await query.get();
  let qty = 0;
  for (const doc of snap.docs) {
    qty += Number(doc.data().quantity);
  }
  return qty;
}
async function setReservationsForSO(opts) {
  const tx = opts.executor;
  const existingSnap = await db16().collection("stockReservations").where("organizationId", "==", opts.organizationId).where("salesOrderId", "==", opts.salesOrderId).get();
  for (const doc of existingSnap.docs) {
    tx.delete(doc.ref);
  }
  const agg = /* @__PURE__ */ new Map();
  for (const l of opts.lines) {
    if (!l.itemId || !(l.quantity > 0)) continue;
    agg.set(l.itemId, (agg.get(l.itemId) ?? 0) + l.quantity);
  }
  if (agg.size === 0) return;
  for (const [itemId, quantity] of agg.entries()) {
    const ref = db16().collection("stockReservations").doc();
    tx.set(ref, {
      organizationId: opts.organizationId,
      salesOrderId: opts.salesOrderId,
      itemId,
      warehouseId: opts.warehouseId,
      quantity: String(quantity),
      createdAt: import_firestore4.FieldValue.serverTimestamp(),
      updatedAt: import_firestore4.FieldValue.serverTimestamp()
    });
  }
}
async function clearReservationsForSO(organizationId, salesOrderId, executor) {
  const tx = executor;
  const snap = await db16().collection("stockReservations").where("organizationId", "==", organizationId).where("salesOrderId", "==", salesOrderId).get();
  for (const doc of snap.docs) {
    tx.delete(doc.ref);
  }
}
async function ensureDefaultWarehouse(organizationId) {
  const snap = await db16().collection("warehouses").where("organizationId", "==", organizationId).get();
  if (!snap.empty) {
    const defaultWh = snap.docs.find((d) => d.data().isDefault) ?? snap.docs[0];
    return defaultWh.id;
  }
  const ref = db16().collection("warehouses").doc();
  await ref.set({
    organizationId,
    name: "Main Warehouse",
    isDefault: true,
    createdAt: import_firestore4.FieldValue.serverTimestamp(),
    updatedAt: import_firestore4.FieldValue.serverTimestamp()
  });
  return ref.id;
}

// src/routes/sales-orders.ts
var db17 = () => getDb();
var DEFAULT_SALES_SETTINGS = {
  allowOverselling: false,
  reserveStockOnDraft: false
};
async function getSalesSettings(organizationId) {
  const orgDoc = await db17().collection("organizations").doc(organizationId).get();
  const org = orgDoc.exists ? orgDoc.data() : null;
  return { ...DEFAULT_SALES_SETTINGS, ...org?.salesSettings ?? {} };
}
async function resolveSOWarehouse(organizationId, soWarehouseId) {
  if (soWarehouseId) return soWarehouseId;
  return ensureDefaultWarehouse(organizationId);
}
async function postSOMovements(opts) {
  const linkedIds = opts.lines.map((i) => i.itemId).filter((x) => x != null);
  if (linkedIds.length === 0) return;
  const itemDocs = await Promise.all(
    linkedIds.map((id) => db17().collection("items").doc(id).get())
  );
  const linkedMap = new Map(
    itemDocs.filter((d) => d.exists && d.data().organizationId === opts.organizationId).map((d) => [d.id, { id: d.id, ...d.data() }])
  );
  for (const it of opts.lines) {
    if (!it.itemId) continue;
    const linked = linkedMap.get(it.itemId);
    if (!linked) continue;
    await recordMovement({
      organizationId: opts.organizationId,
      itemId: it.itemId,
      warehouseId: opts.warehouseId,
      direction: opts.direction,
      quantity: it.quantity,
      unitCost: Number(linked.avgCost),
      reason: opts.reason,
      referenceType: "sales_order",
      referenceId: opts.salesOrderId,
      createdById: opts.userId
    });
  }
}
var salesOrdersRouter = (0, import_express15.Router)();
function genNumber() {
  const d = /* @__PURE__ */ new Date();
  return `SO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9e3) + 1e3}`;
}
async function fmt5(s) {
  let clientName = null;
  if (s.clientId) {
    const clientDoc = await db17().collection("clients").doc(s.clientId).get();
    if (clientDoc.exists) clientName = clientDoc.data().name ?? null;
  }
  return {
    id: s.id,
    orderNumber: s.orderNumber,
    clientId: s.clientId ?? null,
    clientName,
    quotationId: s.quotationId ?? null,
    warehouseId: s.warehouseId ?? null,
    status: s.status,
    subtotal: Number(s.subtotal),
    discountAmount: Number(s.discountAmount),
    taxAmount: Number(s.taxAmount),
    total: Number(s.total),
    expectedDeliveryAt: s.expectedDeliveryAt ?? null,
    notes: s.notes ?? null,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt
  };
}
async function recalc(soId) {
  const itemsSnap = await db17().collection("sales_order_items").where("salesOrderId", "==", soId).get();
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const subtotal = items.reduce((acc, i) => acc + Number(i.totalPrice), 0);
  const tax = subtotal * 0.18;
  await db17().collection("sales_orders").doc(soId).update({
    subtotal: subtotal.toFixed(2),
    taxAmount: tax.toFixed(2),
    total: (subtotal + tax).toFixed(2),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
async function validateSOOwnership(orgId, b) {
  if (b.warehouseId) {
    const wDoc = await db17().collection("warehouses").doc(b.warehouseId).get();
    if (!wDoc.exists || wDoc.data().organizationId !== orgId) return "Invalid warehouse";
  }
  if (Array.isArray(b.items)) {
    const ids = Array.from(new Set(b.items.map((i) => i.itemId).filter((x) => x != null)));
    if (ids.length > 0) {
      const itemDocs = await Promise.all(ids.map((id) => db17().collection("items").doc(id).get()));
      const ownedCount = itemDocs.filter((d) => d.exists && d.data().organizationId === orgId).length;
      if (ownedCount !== ids.length) return "One or more items not found in this organization";
    }
  }
  return null;
}
salesOrdersRouter.get("/sales-orders", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    let rows;
    try {
      const snap = await db17().collection("sales_orders").where("organizationId", "==", orgId).orderBy("createdAt", "desc").get();
      rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      if (err?.code === 9 || err?.code === "FAILED_PRECONDITION") {
        const snap = await db17().collection("sales_orders").where("organizationId", "==", orgId).get();
        rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
      } else {
        throw err;
      }
    }
    res.json(await Promise.all(rows.map(fmt5)));
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to list sales orders" });
  }
});
salesOrdersRouter.post("/sales-orders", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const b = req.body ?? {};
    const ownErr = await validateSOOwnership(orgId, b);
    if (ownErr) {
      res.status(400).json({ error: ownErr });
      return;
    }
    if (b.status !== void 0 && b.status !== "draft") {
      res.status(400).json({ error: "Sales orders must be created in draft. Confirm via PATCH to deduct stock." });
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const soData = {
      organizationId: orgId,
      orderNumber: genNumber(),
      clientId: b.clientId ?? null,
      warehouseId: b.warehouseId ?? null,
      status: "draft",
      subtotal: "0",
      discountAmount: "0",
      taxAmount: "0",
      total: "0",
      expectedDeliveryAt: b.expectedDeliveryAt ? new Date(b.expectedDeliveryAt).toISOString() : null,
      notes: b.notes ?? null,
      createdById: req.user.userId,
      createdAt: now,
      updatedAt: now
    };
    const soRef = await db17().collection("sales_orders").add(soData);
    const s = { id: soRef.id, ...soData };
    if (Array.isArray(b.items) && b.items.length > 0) {
      const itemPromises = b.items.map(
        async (it) => {
          const itemData = {
            salesOrderId: s.id,
            itemId: it.itemId ?? null,
            description: it.description,
            quantity: it.quantity,
            unitPrice: String(it.unitPrice),
            totalPrice: (it.quantity * it.unitPrice).toFixed(2)
          };
          const ref = await db17().collection("sales_order_items").add(itemData);
          return { id: ref.id, ...itemData };
        }
      );
      await Promise.all(itemPromises);
      await recalc(s.id);
    }
    const settings = await getSalesSettings(orgId);
    if (settings.reserveStockOnDraft && Array.isArray(b.items) && b.items.length > 0) {
      const whId = await resolveSOWarehouse(orgId, s.warehouseId ?? null);
      await db17().runTransaction(async (tx) => {
        await setReservationsForSO({
          organizationId: orgId,
          salesOrderId: s.id,
          lines: b.items.map((it) => ({
            itemId: it.itemId,
            quantity: it.quantity
          })),
          warehouseId: whId,
          executor: tx
        });
      });
    }
    const updatedDoc = await db17().collection("sales_orders").doc(s.id).get();
    const updated = { id: updatedDoc.id, ...updatedDoc.data() };
    await logAction(req, "CREATE", "sales_order", s.id);
    res.status(201).json(await fmt5(updated));
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to create sales order" });
  }
});
salesOrdersRouter.get("/sales-orders/:id", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const id = req.params.id;
    const soDoc = await db17().collection("sales_orders").doc(id).get();
    if (!soDoc.exists || soDoc.data().organizationId !== orgId) {
      res.status(404).json({ error: "Sales order not found" });
      return;
    }
    const s = { id: soDoc.id, ...soDoc.data() };
    const itemsSnap = await db17().collection("sales_order_items").where("salesOrderId", "==", id).get();
    const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const whId = await resolveSOWarehouse(orgId, s.warehouseId ?? null);
    const warehousesSnap = await db17().collection("warehouses").where("organizationId", "==", orgId).get();
    const warehouses = warehousesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const linkedItemIds = Array.from(
      new Set(items.map((i) => i.itemId).filter((x) => x != null))
    );
    const availability = /* @__PURE__ */ new Map();
    for (const itemId of linkedItemIds) {
      const rows = [];
      for (const wh of warehouses) {
        const onHand = await getStockLevel(orgId, itemId, wh.id);
        const reserved = await getReservedStock(orgId, itemId, wh.id, id);
        rows.push({
          warehouseId: wh.id,
          warehouseName: wh.name,
          isOrderWarehouse: wh.id === whId,
          onHand,
          reserved,
          available: onHand - reserved
        });
      }
      availability.set(itemId, rows);
    }
    res.json({
      ...await fmt5(s),
      items: items.map((i) => ({
        id: i.id,
        itemId: i.itemId ?? null,
        description: i.description,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
        availability: i.itemId ? availability.get(i.itemId) ?? [] : []
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to get sales order" });
  }
});
salesOrdersRouter.patch("/sales-orders/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const b = req.body ?? {};
  const ownErr = await validateSOOwnership(orgId, b);
  if (ownErr) {
    res.status(400).json({ error: ownErr });
    return;
  }
  const prevDoc = await db17().collection("sales_orders").doc(id).get();
  if (!prevDoc.exists || prevDoc.data().organizationId !== orgId) {
    res.status(404).json({ error: "Sales order not found" });
    return;
  }
  const prev = { id: prevDoc.id, ...prevDoc.data() };
  const wasActive = ["confirmed", "in_production", "delivered"].includes(prev.status);
  const stillActive = b.status === void 0 || ["confirmed", "in_production", "delivered"].includes(b.status);
  if (Array.isArray(b.items) && wasActive && stillActive) {
    res.status(409).json({ error: "Revert sales order to draft before editing line items" });
    return;
  }
  if (b.warehouseId !== void 0 && b.warehouseId !== prev.warehouseId && wasActive && stillActive) {
    res.status(409).json({ error: "Revert sales order to draft before changing warehouse" });
    return;
  }
  const prevLinesSnap = await db17().collection("sales_order_items").where("salesOrderId", "==", id).get();
  const prevLines = prevLinesSnap.docs.map((d) => ({ itemId: d.data().itemId ?? null, quantity: d.data().quantity }));
  const prevWarehouseId = await resolveSOWarehouse(orgId, prev.warehouseId ?? null);
  const updates = { updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  for (const f of ["clientId", "warehouseId", "status", "notes"]) {
    if (b[f] !== void 0) updates[f] = b[f];
  }
  if (b.expectedDeliveryAt !== void 0) updates.expectedDeliveryAt = b.expectedDeliveryAt ? new Date(b.expectedDeliveryAt).toISOString() : null;
  const becomingActive = b.status !== void 0 && !wasActive && ["confirmed", "in_production", "delivered"].includes(b.status);
  const becomingDead = b.status !== void 0 && wasActive && ["cancelled", "draft"].includes(b.status);
  const settings = await getSalesSettings(orgId);
  const willEndAsDraft = b.status !== void 0 ? b.status === "draft" : prev.status === "draft";
  const willBeCancelled = b.status !== void 0 ? b.status === "cancelled" : prev.status === "cancelled";
  try {
    await db17().runTransaction(async (tx) => {
      tx.update(db17().collection("sales_orders").doc(id), updates);
      if (becomingDead) {
        await postSOMovements({
          organizationId: orgId,
          salesOrderId: id,
          lines: prevLines,
          warehouseId: prevWarehouseId,
          direction: "in",
          reason: "return",
          userId: req.user.userId
        });
      }
      if (Array.isArray(b.items)) {
        const existingSnap = await db17().collection("sales_order_items").where("salesOrderId", "==", id).get();
        for (const doc of existingSnap.docs) {
          tx.delete(doc.ref);
        }
        if (b.items.length > 0) {
          for (const it of b.items) {
            const itemData = {
              salesOrderId: id,
              itemId: it.itemId ?? null,
              description: it.description,
              quantity: it.quantity,
              unitPrice: String(it.unitPrice),
              totalPrice: (it.quantity * it.unitPrice).toFixed(2)
            };
            const ref = db17().collection("sales_order_items").doc();
            tx.set(ref, itemData);
          }
        }
        const linesSnap = await db17().collection("sales_order_items").where("salesOrderId", "==", id).get();
        const lines = linesSnap.docs.map((d) => d.data());
        const subtotal = lines.reduce((acc, l) => acc + Number(l.totalPrice), 0);
        const total = subtotal;
        tx.update(db17().collection("sales_orders").doc(id), {
          subtotal: subtotal.toFixed(2),
          total: total.toFixed(2),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      if (becomingActive) {
        const currentRowsSnap = await db17().collection("sales_order_items").where("salesOrderId", "==", id).get();
        const currentRows = currentRowsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const unlinked = currentRows.filter((l) => l.itemId == null).map((l) => ({ id: l.id, description: l.description, quantity: l.quantity }));
        if (unlinked.length > 0) {
          const err = new Error("UNLINKED_LINES");
          err.unlinkedLines = unlinked;
          throw err;
        }
        const currentLines = currentRows.map((l) => ({ itemId: l.itemId ?? null, quantity: l.quantity }));
        const refreshedDoc = await db17().collection("sales_orders").doc(id).get();
        const refreshed = refreshedDoc.data();
        const whId = await resolveSOWarehouse(orgId, refreshed.warehouseId ?? null);
        const need = /* @__PURE__ */ new Map();
        for (const l of currentLines) {
          if (!l.itemId) continue;
          need.set(l.itemId, (need.get(l.itemId) ?? 0) + l.quantity);
        }
        const shortages = [];
        for (const [itemId, needed] of need) {
          const have = await getStockLevel(orgId, itemId, whId);
          const reserved = await getReservedStock(orgId, itemId, whId, id);
          const available = have - reserved;
          if (available < needed) shortages.push({ itemId, needed, available });
        }
        if (shortages.length > 0 && !settings.allowOverselling) {
          const err = new Error("INSUFFICIENT_STOCK");
          err.shortages = shortages;
          throw err;
        }
        if (shortages.length > 0) {
          req.log.warn({ shortages, salesOrderId: id }, "SO confirmed with overselling allowed");
        }
        await postSOMovements({
          organizationId: orgId,
          salesOrderId: id,
          lines: currentLines,
          warehouseId: whId,
          direction: "out",
          reason: "sale",
          userId: req.user.userId
        });
        await clearReservationsForSO(orgId, id, tx);
      }
      if (willBeCancelled) {
        await clearReservationsForSO(orgId, id, tx);
      } else if (willEndAsDraft) {
        if (settings.reserveStockOnDraft) {
          const finalLinesSnap = await db17().collection("sales_order_items").where("salesOrderId", "==", id).get();
          const finalLines = finalLinesSnap.docs.map((d) => ({ itemId: d.data().itemId ?? null, quantity: d.data().quantity }));
          const refreshedDoc = await db17().collection("sales_orders").doc(id).get();
          const refreshed = refreshedDoc.data();
          const whId = await resolveSOWarehouse(orgId, refreshed.warehouseId ?? null);
          await setReservationsForSO({
            organizationId: orgId,
            salesOrderId: id,
            lines: finalLines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
            warehouseId: whId,
            executor: tx
          });
        } else {
          await clearReservationsForSO(orgId, id, tx);
        }
      }
    });
  } catch (e) {
    const msg = e.message;
    const shortages = e.shortages;
    const unlinkedLines = e.unlinkedLines;
    if (msg === "INSUFFICIENT_STOCK" && Array.isArray(shortages)) {
      req.log.warn({ shortages }, "SO confirmation blocked by insufficient stock");
      res.status(409).json({ error: "Insufficient stock to confirm sales order", shortages });
      return;
    }
    if (msg === "UNLINKED_LINES" && Array.isArray(unlinkedLines)) {
      req.log.warn({ unlinkedLines }, "SO confirmation blocked by unlinked lines");
      res.status(409).json({
        error: "Link every line to an inventory item before confirming",
        unlinkedLines
      });
      return;
    }
    req.log.error({ err: e }, "SO patch transaction failed; nothing committed");
    res.status(500).json({ error: "Sales order update failed; no changes applied" });
    return;
  }
  const updatedDoc = await db17().collection("sales_orders").doc(id).get();
  const updated = { id: updatedDoc.id, ...updatedDoc.data() };
  res.json(await fmt5(updated));
});
salesOrdersRouter.post("/sales-orders/from-quotation/:quotationId", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const qid = req.params.quotationId;
    const qDoc = await db17().collection("quotations").doc(qid).get();
    if (!qDoc.exists || qDoc.data().organizationId !== orgId) {
      res.status(404).json({ error: "Quotation not found" });
      return;
    }
    const q = { id: qDoc.id, ...qDoc.data() };
    const itemsSnap = await db17().collection("quotation_items").where("quotationId", "==", qid).get();
    const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const soData = {
      organizationId: orgId,
      orderNumber: genNumber(),
      clientId: q.clientId,
      quotationId: qid,
      status: "draft",
      subtotal: q.subtotal,
      discountAmount: q.discountAmount,
      taxAmount: q.taxAmount,
      total: q.total,
      createdById: req.user.userId,
      createdAt: now,
      updatedAt: now
    };
    const soRef = await db17().collection("sales_orders").add(soData);
    const s = { id: soRef.id, ...soData };
    if (items.length > 0) {
      for (const i of items) {
        const itemData = {
          salesOrderId: s.id,
          itemId: i.itemId ?? null,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice
        };
        await db17().collection("sales_order_items").add(itemData);
      }
    }
    const settings = await getSalesSettings(orgId);
    if (settings.reserveStockOnDraft && items.length > 0) {
      const whId = await resolveSOWarehouse(orgId, s.warehouseId ?? null);
      await db17().runTransaction(async (tx) => {
        await setReservationsForSO({
          organizationId: orgId,
          salesOrderId: s.id,
          lines: items.map((i) => ({
            itemId: i.itemId,
            quantity: Number(i.quantity)
          })),
          warehouseId: whId,
          executor: tx
        });
      });
    }
    await logAction(req, "PROMOTE", "sales_order", s.id, `From quotation ${q.quotationNumber}`);
    res.status(201).json(await fmt5(s));
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to create sales order from quotation" });
  }
});
var sales_orders_default = salesOrdersRouter;

// src/routes/invoices.ts
var import_express16 = require("express");

// src/lib/gst.ts
function calcGst(taxableAmount, taxRate, sellerState, buyerState) {
  const tax = taxableAmount * taxRate / 100;
  const sameState = sellerState && buyerState && sellerState.trim().toLowerCase() === buyerState.trim().toLowerCase();
  if (sameState) {
    const half = tax / 2;
    return { cgst: round2(half), sgst: round2(half), igst: 0, total: round2(tax) };
  }
  return { cgst: 0, sgst: 0, igst: round2(tax), total: round2(tax) };
}
function round2(n) {
  return Math.round(n * 100) / 100;
}

// src/lib/accounting.ts
var import_firestore5 = require("firebase-admin/firestore");
var db18 = () => getDb();
var SEED = [
  { code: "1000", name: "Cash", type: "asset", subtype: "cash" },
  { code: "1010", name: "Bank", type: "asset", subtype: "bank" },
  { code: "1100", name: "Accounts Receivable", type: "asset", subtype: "ar" },
  { code: "1200", name: "Inventory", type: "asset", subtype: "inventory" },
  { code: "1300", name: "GST Input Credit", type: "asset", subtype: "gst_input" },
  { code: "2000", name: "Accounts Payable", type: "liability", subtype: "ap" },
  { code: "2100", name: "GST Output Payable", type: "liability", subtype: "gst_output" },
  { code: "2200", name: "Salaries Payable", type: "liability", subtype: "payroll_payable" },
  { code: "3000", name: "Owner's Equity", type: "equity", subtype: "equity" },
  { code: "4000", name: "Sales Revenue", type: "income", subtype: "sales" },
  { code: "5000", name: "Cost of Goods Sold", type: "expense", subtype: "cogs" },
  { code: "5100", name: "Salaries Expense", type: "expense", subtype: "payroll" },
  { code: "5200", name: "Rent Expense", type: "expense", subtype: "rent" },
  { code: "5300", name: "Utilities Expense", type: "expense", subtype: "utilities" },
  { code: "5400", name: "Travel Expense", type: "expense", subtype: "travel" },
  { code: "5500", name: "Office Expense", type: "expense", subtype: "office" },
  { code: "5600", name: "Marketing Expense", type: "expense", subtype: "marketing" },
  { code: "5900", name: "Other Expense", type: "expense", subtype: "other" }
];
async function ensureChartOfAccounts(organizationId) {
  const snap = await db18().collection("accounts").where("organizationId", "==", organizationId).limit(1).get();
  if (!snap.empty) return;
  const batch = db18().batch();
  for (const s of SEED) {
    const ref = db18().collection("accounts").doc();
    batch.set(ref, {
      organizationId,
      code: s.code,
      name: s.name,
      type: s.type,
      subtype: s.subtype,
      isSystem: true,
      createdAt: import_firestore5.FieldValue.serverTimestamp(),
      updatedAt: import_firestore5.FieldValue.serverTimestamp()
    });
  }
  await batch.commit();
}
async function postJournal(opts) {
  await ensureChartOfAccounts(opts.organizationId);
  const totalDr = opts.lines.reduce((s, l) => s + Number(l.debit ?? 0), 0);
  const totalCr = opts.lines.reduce((s, l) => s + Number(l.credit ?? 0), 0);
  if (Math.abs(totalDr - totalCr) > 0.01) {
    throw new Error(`Unbalanced journal: dr=${totalDr} cr=${totalCr}`);
  }
  const accountsSnap = await db18().collection("accounts").where("organizationId", "==", opts.organizationId).get();
  const byCode = /* @__PURE__ */ new Map();
  accountsSnap.docs.forEach((d) => {
    byCode.set(d.data().code, { id: d.id, ...d.data() });
  });
  const usable = opts.lines.filter((l) => (l.debit ?? 0) !== 0 || (l.credit ?? 0) !== 0);
  for (const ln of usable) {
    if (!byCode.has(ln.accountCode)) {
      throw new Error(`Unknown account code ${ln.accountCode}`);
    }
  }
  if (usable.length === 0) {
    throw new Error("Journal has no non-zero lines");
  }
  return await db18().runTransaction(async (tx) => {
    const entryRef = db18().collection("journalEntries").doc();
    tx.set(entryRef, {
      organizationId: opts.organizationId,
      entryDate: opts.entryDate.toISOString().slice(0, 10),
      memo: opts.memo ?? null,
      sourceType: opts.sourceType ?? null,
      sourceId: opts.sourceId ?? null,
      createdAt: import_firestore5.FieldValue.serverTimestamp(),
      updatedAt: import_firestore5.FieldValue.serverTimestamp()
    });
    for (const ln of usable) {
      const acct = byCode.get(ln.accountCode);
      const lineRef = db18().collection("journalLines").doc();
      tx.set(lineRef, {
        organizationId: opts.organizationId,
        entryId: entryRef.id,
        accountId: acct.id,
        debit: (ln.debit ?? 0).toFixed(2),
        credit: (ln.credit ?? 0).toFixed(2),
        description: ln.description ?? null,
        createdAt: import_firestore5.FieldValue.serverTimestamp(),
        updatedAt: import_firestore5.FieldValue.serverTimestamp()
      });
    }
    return entryRef.id;
  });
}
async function reverseAndRepost(organizationId, sourceType, sourceId, rebuild, opts) {
  await ensureChartOfAccounts(organizationId);
  const lines = await rebuild();
  const totalDr = (lines ?? []).reduce((s, l) => s + Number(l.debit ?? 0), 0);
  const totalCr = (lines ?? []).reduce((s, l) => s + Number(l.credit ?? 0), 0);
  if (lines && Math.abs(totalDr - totalCr) > 0.01) {
    throw new Error(`Unbalanced journal: dr=${totalDr} cr=${totalCr}`);
  }
  const accountsSnap = await db18().collection("accounts").where("organizationId", "==", organizationId).get();
  const byCode = /* @__PURE__ */ new Map();
  accountsSnap.docs.forEach((d) => {
    byCode.set(d.data().code, { id: d.id, ...d.data() });
  });
  const usable = (lines ?? []).filter((l) => (l.debit ?? 0) !== 0 || (l.credit ?? 0) !== 0);
  for (const ln of usable) {
    if (!byCode.has(ln.accountCode)) {
      throw new Error(`Unknown account code ${ln.accountCode}`);
    }
  }
  await db18().runTransaction(async (tx) => {
    const existingSnap = await db18().collection("journalEntries").where("organizationId", "==", organizationId).where("sourceType", "==", sourceType).where("sourceId", "==", sourceId).get();
    for (const doc of existingSnap.docs) {
      const linesSnap = await db18().collection("journalLines").where("entryId", "==", doc.id).get();
      for (const lineDoc of linesSnap.docs) {
        tx.delete(lineDoc.ref);
      }
      tx.delete(doc.ref);
    }
    if (usable.length === 0) return;
    const entryRef = db18().collection("journalEntries").doc();
    tx.set(entryRef, {
      organizationId,
      entryDate: opts.entryDate.toISOString().slice(0, 10),
      memo: opts.memo ?? null,
      sourceType,
      sourceId,
      createdAt: import_firestore5.FieldValue.serverTimestamp(),
      updatedAt: import_firestore5.FieldValue.serverTimestamp()
    });
    for (const ln of usable) {
      const acct = byCode.get(ln.accountCode);
      const lineRef = db18().collection("journalLines").doc();
      tx.set(lineRef, {
        organizationId,
        entryId: entryRef.id,
        accountId: acct.id,
        debit: (ln.debit ?? 0).toFixed(2),
        credit: (ln.credit ?? 0).toFixed(2),
        description: ln.description ?? null,
        createdAt: import_firestore5.FieldValue.serverTimestamp(),
        updatedAt: import_firestore5.FieldValue.serverTimestamp()
      });
    }
  });
}

// src/routes/invoices.ts
var db19 = () => getDb();
var invoicesRouter = (0, import_express16.Router)();
function genNumber2() {
  const d = /* @__PURE__ */ new Date();
  return `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9e3) + 1e3}`;
}
async function fmt6(inv) {
  let clientName = null;
  if (inv.clientId) {
    const clientDoc = await db19().collection("clients").doc(inv.clientId).get();
    if (clientDoc.exists) clientName = clientDoc.data().name ?? null;
  }
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    clientId: inv.clientId ?? null,
    clientName,
    salesOrderId: inv.salesOrderId ?? null,
    status: inv.status,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate ?? null,
    sellerState: inv.sellerState ?? null,
    buyerState: inv.buyerState ?? null,
    subtotal: Number(inv.subtotal),
    discountAmount: Number(inv.discountAmount),
    taxableAmount: Number(inv.taxableAmount),
    cgst: Number(inv.cgst),
    sgst: Number(inv.sgst),
    igst: Number(inv.igst),
    taxRate: Number(inv.taxRate),
    total: Number(inv.total),
    amountPaid: Number(inv.amountPaid),
    notes: inv.notes ?? null,
    terms: inv.terms ?? null,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt
  };
}
async function recalc2(invoiceId) {
  const invDoc = await db19().collection("invoices").doc(invoiceId).get();
  if (!invDoc.exists) return;
  const inv = { id: invDoc.id, ...invDoc.data() };
  const itemsSnap = await db19().collection("invoice_items").where("invoiceId", "==", invoiceId).get();
  const items = itemsSnap.docs.map((d) => d.data());
  const subtotal = items.reduce((acc, i) => acc + Number(i.totalPrice), 0);
  const discountAmount = Number(inv.discountAmount);
  const taxable = Math.max(0, subtotal - discountAmount);
  const taxRate = Number(inv.taxRate);
  const gst = calcGst(taxable, taxRate, inv.sellerState, inv.buyerState);
  const total = round2(taxable + gst.total);
  const paysSnap = await db19().collection("payments").where("invoiceId", "==", invoiceId).get();
  const pays = paysSnap.docs.map((d) => d.data());
  const paid = pays.reduce((acc, p) => acc + Number(p.amount), 0);
  let status = inv.status;
  if (paid >= total && total > 0) status = "paid";
  else if (paid > 0) status = "partial";
  else if (inv.dueDate && new Date(inv.dueDate) < /* @__PURE__ */ new Date()) status = "overdue";
  else if (status === "paid" || status === "partial") status = "sent";
  await db19().collection("invoices").doc(invoiceId).update({
    subtotal: subtotal.toFixed(2),
    taxableAmount: taxable.toFixed(2),
    cgst: gst.cgst.toFixed(2),
    sgst: gst.sgst.toFixed(2),
    igst: gst.igst.toFixed(2),
    total: total.toFixed(2),
    amountPaid: paid.toFixed(2),
    status,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  const isPostable = status !== "draft" && status !== "cancelled";
  await reverseAndRepost(
    inv.organizationId,
    "invoice",
    invoiceId,
    async () => {
      if (!isPostable || total <= 0) return null;
      const taxTotal = round2(gst.cgst + gst.sgst + gst.igst);
      const lines = [
        { accountCode: "1100", debit: total, description: `Invoice ${inv.invoiceNumber}` },
        { accountCode: "4000", credit: taxable, description: "Sales revenue" }
      ];
      if (taxTotal > 0) lines.push({ accountCode: "2100", credit: taxTotal, description: "GST output" });
      return lines;
    },
    { entryDate: new Date(inv.issueDate), memo: `Invoice ${inv.invoiceNumber}` }
  );
}
invoicesRouter.get("/invoices", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    let rows;
    try {
      const snap = await db19().collection("invoices").where("organizationId", "==", orgId).orderBy("createdAt", "desc").get();
      rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      if (err?.code === 9 || err?.code === "FAILED_PRECONDITION") {
        const snap = await db19().collection("invoices").where("organizationId", "==", orgId).get();
        rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
      } else {
        throw err;
      }
    }
    const statusQ = req.query.status;
    if (statusQ) rows = rows.filter((r) => r.status === statusQ);
    res.json(await Promise.all(rows.map(fmt6)));
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to list invoices" });
  }
});
invoicesRouter.post("/invoices", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const b = req.body ?? {};
    const orgDoc = await db19().collection("organizations").doc(orgId).get();
    const org = orgDoc.exists ? orgDoc.data() : null;
    let buyerState = null;
    if (b.clientId) {
      const clientDoc = await db19().collection("clients").doc(b.clientId).get();
      if (clientDoc.exists) buyerState = clientDoc.data().state ?? null;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const invData = {
      organizationId: orgId,
      invoiceNumber: genNumber2(),
      clientId: b.clientId ?? null,
      salesOrderId: b.salesOrderId ?? null,
      status: "draft",
      issueDate: now,
      dueDate: b.dueDate ? new Date(b.dueDate).toISOString() : null,
      sellerState: org?.state ?? null,
      buyerState,
      subtotal: "0",
      discountAmount: "0",
      taxableAmount: "0",
      cgst: "0",
      sgst: "0",
      igst: "0",
      taxRate: b.taxRate !== void 0 && b.taxRate !== null ? String(b.taxRate) : "18",
      total: "0",
      amountPaid: "0",
      notes: b.notes ?? null,
      terms: b.terms ?? "Payment due within 30 days. GST as applicable.",
      createdById: req.user.userId,
      createdAt: now,
      updatedAt: now
    };
    const invRef = await db19().collection("invoices").add(invData);
    const inv = { id: invRef.id, ...invData };
    if (Array.isArray(b.items) && b.items.length > 0) {
      for (const it of b.items) {
        const itemData = {
          invoiceId: inv.id,
          description: it.description,
          quantity: it.quantity,
          unitPrice: String(it.unitPrice),
          totalPrice: (it.quantity * it.unitPrice).toFixed(2)
        };
        await db19().collection("invoice_items").add(itemData);
      }
    }
    await recalc2(inv.id);
    const updatedDoc = await db19().collection("invoices").doc(inv.id).get();
    const updated = { id: updatedDoc.id, ...updatedDoc.data() };
    await logAction(req, "CREATE", "invoice", inv.id);
    res.status(201).json(await fmt6(updated));
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to create invoice" });
  }
});
invoicesRouter.get("/invoices/:id", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const id = req.params.id;
    const invDoc = await db19().collection("invoices").doc(id).get();
    if (!invDoc.exists || invDoc.data().organizationId !== orgId) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    const inv = { id: invDoc.id, ...invDoc.data() };
    const itemsSnap = await db19().collection("invoice_items").where("invoiceId", "==", id).get();
    const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const paysSnap = await db19().collection("payments").where("invoiceId", "==", id).get();
    const pays = paysSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    let client = null;
    if (inv.clientId) {
      const clientDoc = await db19().collection("clients").doc(inv.clientId).get();
      if (clientDoc.exists) client = { id: clientDoc.id, ...clientDoc.data() };
    }
    res.json({
      ...await fmt6(inv),
      items: items.map((i) => ({
        id: i.id,
        description: i.description,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice)
      })),
      payments: pays.map((p) => ({
        id: p.id,
        invoiceId: p.invoiceId,
        amount: Number(p.amount),
        method: p.method,
        reference: p.reference ?? null,
        paidAt: p.paidAt,
        notes: p.notes ?? null,
        recordedByName: null,
        createdAt: p.createdAt
      })),
      client: client ?? null
    });
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to get invoice" });
  }
});
invoicesRouter.patch("/invoices/:id", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const id = req.params.id;
    const b = req.body ?? {};
    const invDoc = await db19().collection("invoices").doc(id).get();
    if (!invDoc.exists || invDoc.data().organizationId !== orgId) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    const updates = { updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    for (const f of ["clientId", "salesOrderId", "notes", "terms"]) {
      if (b[f] !== void 0) updates[f] = b[f];
    }
    if (b.dueDate !== void 0) updates.dueDate = b.dueDate ? new Date(b.dueDate).toISOString() : null;
    if (b.taxRate !== void 0 && b.taxRate !== null) updates.taxRate = String(b.taxRate);
    await db19().collection("invoices").doc(id).update(updates);
    if (Array.isArray(b.items)) {
      const existingSnap = await db19().collection("invoice_items").where("invoiceId", "==", id).get();
      for (const doc of existingSnap.docs) {
        await doc.ref.delete();
      }
      if (b.items.length > 0) {
        for (const it of b.items) {
          const itemData = {
            invoiceId: id,
            description: it.description,
            quantity: it.quantity,
            unitPrice: String(it.unitPrice),
            totalPrice: (it.quantity * it.unitPrice).toFixed(2)
          };
          await db19().collection("invoice_items").add(itemData);
        }
      }
    }
    await recalc2(id);
    const updatedDoc = await db19().collection("invoices").doc(id).get();
    const updated = { id: updatedDoc.id, ...updatedDoc.data() };
    res.json(await fmt6(updated));
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to update invoice" });
  }
});
invoicesRouter.patch("/invoices/:id/status", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const id = req.params.id;
    const { status } = req.body ?? {};
    if (!["draft", "sent", "partial", "paid", "overdue", "cancelled"].includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    const invDoc = await db19().collection("invoices").doc(id).get();
    if (!invDoc.exists || invDoc.data().organizationId !== orgId) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    await db19().collection("invoices").doc(id).update({
      status,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    await logAction(req, "STATUS_CHANGE", "invoice", id, `Status changed to ${status}`);
    const updatedDoc = await db19().collection("invoices").doc(id).get();
    const inv = { id: updatedDoc.id, ...updatedDoc.data() };
    res.json(await fmt6(inv));
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to update invoice status" });
  }
});
invoicesRouter.post("/invoices/from-sales-order/:salesOrderId", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const soId = req.params.salesOrderId;
    const soDoc = await db19().collection("sales_orders").doc(soId).get();
    if (!soDoc.exists || soDoc.data().organizationId !== orgId) {
      res.status(404).json({ error: "Sales order not found" });
      return;
    }
    const so = { id: soDoc.id, ...soDoc.data() };
    const itemsSnap = await db19().collection("sales_order_items").where("salesOrderId", "==", soId).get();
    const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const orgDoc = await db19().collection("organizations").doc(orgId).get();
    const org = orgDoc.exists ? orgDoc.data() : null;
    let buyerState = null;
    if (so.clientId) {
      const clientDoc = await db19().collection("clients").doc(so.clientId).get();
      if (clientDoc.exists) buyerState = clientDoc.data().state ?? null;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const invData = {
      organizationId: orgId,
      invoiceNumber: genNumber2(),
      clientId: so.clientId,
      salesOrderId: soId,
      status: "sent",
      issueDate: now,
      dueDate: new Date(Date.now() + 30 * 864e5).toISOString(),
      sellerState: org?.state ?? null,
      buyerState,
      subtotal: "0",
      discountAmount: "0",
      taxableAmount: "0",
      cgst: "0",
      sgst: "0",
      igst: "0",
      taxRate: "18",
      total: "0",
      amountPaid: "0",
      createdById: req.user.userId,
      createdAt: now,
      updatedAt: now
    };
    const invRef = await db19().collection("invoices").add(invData);
    const inv = { id: invRef.id, ...invData };
    if (items.length > 0) {
      for (const i of items) {
        const itemData = {
          invoiceId: inv.id,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice
        };
        await db19().collection("invoice_items").add(itemData);
      }
    }
    await recalc2(inv.id);
    const updatedDoc = await db19().collection("invoices").doc(inv.id).get();
    const updated = { id: updatedDoc.id, ...updatedDoc.data() };
    await logAction(req, "PROMOTE", "invoice", inv.id, `From SO ${so.orderNumber}`);
    res.status(201).json(await fmt6(updated));
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to create invoice from sales order" });
  }
});
var invoices_default = invoicesRouter;

// src/routes/payments.ts
var import_express17 = require("express");
var db20 = () => getDb();
async function repostPayment(p) {
  await reverseAndRepost(
    p.organizationId,
    "payment",
    p.id,
    async () => [
      { accountCode: p.method === "cash" ? "1000" : "1010", debit: Number(p.amount), description: `Payment ${p.reference ?? ""}`.trim() },
      { accountCode: "1100", credit: Number(p.amount), description: "AR reduction" }
    ],
    { entryDate: new Date(p.paidAt), memo: `Payment for invoice` }
  );
}
var paymentsRouter = (0, import_express17.Router)();
function fmt7(p) {
  return {
    id: p.id,
    invoiceId: p.invoiceId,
    amount: Number(p.amount),
    method: p.method,
    reference: p.reference ?? null,
    paidAt: p.paidAt,
    notes: p.notes ?? null,
    recordedByName: null,
    createdAt: p.createdAt
  };
}
paymentsRouter.get("/payments", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const invoiceId = req.query.invoiceId ? String(req.query.invoiceId) : null;
    let snap = await db20().collection("payments").where("organizationId", "==", orgId).orderBy("paidAt", "desc").get();
    let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (invoiceId) rows = rows.filter((r) => r.invoiceId === invoiceId);
    res.json(rows.map(fmt7));
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to list payments" });
  }
});
paymentsRouter.post("/payments", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { invoiceId, amount, method, reference, paidAt, notes } = req.body ?? {};
    if (!invoiceId || amount === void 0) {
      res.status(400).json({ error: "invoiceId and amount required" });
      return;
    }
    const invDoc = await db20().collection("invoices").doc(String(invoiceId)).get();
    if (!invDoc.exists || invDoc.data().organizationId !== orgId) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    const inv = { id: invDoc.id, ...invDoc.data() };
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const paymentData = {
      organizationId: orgId,
      invoiceId: String(invoiceId),
      amount: String(amount),
      method: method ?? "bank_transfer",
      reference: reference ?? null,
      paidAt: paidAt ? new Date(paidAt).toISOString() : now,
      notes: notes ?? null,
      recordedById: req.user.userId,
      createdAt: now
    };
    const ref = await db20().collection("payments").add(paymentData);
    const p = { id: ref.id, ...paymentData };
    await recalc2(String(invoiceId));
    await repostPayment(p);
    await logAction(req, "RECORD_PAYMENT", "payment", ref.id, `\u20B9${amount} for invoice ${inv.invoiceNumber}`);
    res.status(201).json(fmt7(p));
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to record payment" });
  }
});
paymentsRouter.delete("/payments/:id", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const id = req.params.id;
    const pDoc = await db20().collection("payments").doc(id).get();
    if (!pDoc.exists || pDoc.data().organizationId !== orgId) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }
    const p = { id: pDoc.id, ...pDoc.data() };
    await db20().collection("payments").doc(id).delete();
    await recalc2(p.invoiceId);
    await reverseAndRepost(p.organizationId, "payment", id, async () => null, { entryDate: /* @__PURE__ */ new Date() });
    res.json({ message: "Payment deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to delete payment" });
  }
});
var payments_default = paymentsRouter;

// src/routes/integrations.ts
var import_express18 = require("express");
var db21 = () => getDb();
var integrationsRouter = (0, import_express18.Router)();
var VALID_PROVIDERS = ["indiamart", "smtp", "twilio"];
function fmt8(i) {
  return {
    id: i.id,
    provider: i.provider,
    enabled: i.enabled,
    config: i.config ?? {},
    lastSyncedAt: i.lastSyncedAt ?? null,
    lastSyncStatus: i.lastSyncStatus ?? null,
    lastSyncMessage: i.lastSyncMessage ?? null,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt
  };
}
integrationsRouter.get("/integrations", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const snap = await db21().collection("integrations").where("organizationId", "==", orgId).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(rows.map(fmt8));
});
integrationsRouter.put("/integrations/:provider", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user.organizationId;
  const provider = req.params.provider;
  if (!VALID_PROVIDERS.includes(provider)) {
    res.status(400).json({ error: "Invalid provider" });
    return;
  }
  const { enabled, config } = req.body ?? {};
  const cfg = typeof config === "object" && config !== null ? config : {};
  for (const k of Object.keys(cfg)) if (cfg[k] === "") delete cfg[k];
  const existingSnap = await db21().collection("integrations").where("organizationId", "==", orgId).where("provider", "==", provider).limit(1).get();
  let row;
  if (!existingSnap.empty) {
    const doc = existingSnap.docs[0];
    await doc.ref.update({ enabled: enabled ?? doc.data().enabled, config: cfg, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
    const updated = await doc.ref.get();
    row = { id: updated.id, ...updated.data() };
  } else {
    const ref = await db21().collection("integrations").add({ organizationId: orgId, provider, enabled: enabled ?? true, config: cfg, createdAt: (/* @__PURE__ */ new Date()).toISOString(), updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
    const snap = await ref.get();
    row = { id: snap.id, ...snap.data() };
  }
  await logAction(req, "UPSERT", "integration", row.id, `Provider ${provider}`);
  res.json(fmt8(row));
});
integrationsRouter.delete("/integrations/:provider", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user.organizationId;
  const provider = req.params.provider;
  const snap = await db21().collection("integrations").where("organizationId", "==", orgId).where("provider", "==", provider).get();
  for (const doc of snap.docs) {
    await doc.ref.delete();
  }
  res.json({ message: "Integration removed" });
});
integrationsRouter.post("/integrations/indiamart/sync", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user.organizationId;
  const integrationSnap = await db21().collection("integrations").where("organizationId", "==", orgId).where("provider", "==", "indiamart").limit(1).get();
  const integration = integrationSnap.empty ? null : { id: integrationSnap.docs[0].id, ...integrationSnap.docs[0].data() };
  if (!integration || !integration.config?.apiKey) {
    res.status(400).json({ error: "IndiaMart integration not configured. Save your API key first." });
    return;
  }
  const apiKey = integration.config.apiKey;
  let imported = 0;
  let message = "";
  try {
    const url = `https://mapi.indiamart.com/wservce/crm/crmListing/v2/?glusr_crm_key=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(15e3) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (data.STATUS && data.STATUS !== "SUCCESS") throw new Error(data.MESSAGE ?? "IndiaMart returned an error");
    const items = Array.isArray(data.RESPONSE) ? data.RESPONSE : [];
    for (const item of items) {
      if (!item.UNIQUE_QUERY_ID) continue;
      const existsSnap = await db21().collection("leads").where("organizationId", "==", orgId).where("externalId", "==", item.UNIQUE_QUERY_ID).limit(1).get();
      if (!existsSnap.empty) continue;
      const sc = scoreLead({
        source: "indiamart",
        phone: item.SENDER_MOBILE,
        email: item.SENDER_EMAIL
      });
      await db21().collection("leads").add({
        organizationId: orgId,
        name: item.SENDER_NAME ?? "IndiaMart lead",
        email: item.SENDER_EMAIL ?? null,
        phone: item.SENDER_MOBILE ?? null,
        company: item.SENDER_COMPANY ?? null,
        city: item.SENDER_CITY ?? null,
        state: item.SENDER_STATE ?? null,
        source: "indiamart",
        externalId: item.UNIQUE_QUERY_ID,
        status: "new",
        priority: sc.priority,
        score: sc.score,
        product: item.QUERY_PRODUCT_NAME ?? null,
        notes: item.QUERY_MESSAGE ?? null,
        nextAction: sc.nextAction,
        metadata: { queryTime: item.QUERY_TIME },
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      imported++;
    }
    message = `Imported ${imported} new leads from IndiaMart.`;
    await db21().collection("integrations").doc(integration.id).update({ lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString(), lastSyncStatus: "success", lastSyncMessage: message });
    res.json({ imported, message });
  } catch (e) {
    message = e.message;
    await db21().collection("integrations").doc(integration.id).update({ lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString(), lastSyncStatus: "error", lastSyncMessage: message });
    res.status(502).json({ imported, message: `Sync failed: ${message}` });
  }
});
var integrations_default = integrationsRouter;

// src/routes/dashboard-widgets.ts
var import_express19 = require("express");

// src/lib/firestore.ts
var import_firestore6 = require("firebase-admin/firestore");
var INDEX_ERROR_CODES = [9, "FAILED_PRECONDITION"];
function isIndexError(err) {
  const code = err?.code;
  return INDEX_ERROR_CODES.includes(code);
}
async function safeGetDocs(q) {
  try {
    return await q.get();
  } catch (err) {
    if (isIndexError(err)) {
      console.warn(`[firestore] Missing index for query. Run with:
  firebase deploy --only firestore:indexes
`, err?.details);
      return { docs: [], size: 0, empty: true };
    }
    throw err;
  }
}

// src/routes/dashboard-widgets.ts
var db22 = () => getDb();
var dashboardWidgetsRouter = (0, import_express19.Router)();
var DASHBOARD_CACHE_TTL = 2 * 60 * 1e3;
dashboardWidgetsRouter.get("/dashboard/widgets", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const cacheKey = `dashboard:${orgId}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }
  const now = /* @__PURE__ */ new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 864e5).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const [leadsSnap, callsSnap, emailsSnap, quotesSnap, invSnap, paySnap, tasksSnap, itemsSnap, stocksSnap, poSnap] = await Promise.all([
    safeGetDocs(db22().collection("leads").where("organizationId", "==", orgId)),
    safeGetDocs(db22().collection("calls").where("organizationId", "==", orgId).where("createdAt", ">=", weekAgo)),
    safeGetDocs(db22().collection("emails").where("organizationId", "==", orgId).where("direction", "==", "outbound").where("createdAt", ">=", weekAgo)),
    safeGetDocs(db22().collection("quotations").where("organizationId", "==", orgId).where("createdAt", ">=", weekAgo)),
    safeGetDocs(db22().collection("invoices").where("organizationId", "==", orgId)),
    safeGetDocs(db22().collection("payments").where("organizationId", "==", orgId).where("paidAt", ">=", monthStart)),
    safeGetDocs(db22().collection("tasks").where("organizationId", "==", orgId).where("status", "==", "open")),
    safeGetDocs(db22().collection("items").where("organizationId", "==", orgId).where("isActive", "==", true)),
    safeGetDocs(db22().collection("stock_movements").where("organizationId", "==", orgId)),
    safeGetDocs(db22().collection("purchase_orders").where("organizationId", "==", orgId))
  ]);
  const allLeads = leadsSnap.docs.map((d) => d.data());
  const newLeadsToday = allLeads.filter((l) => l.createdAt >= startOfDay).length;
  const hotLeads = allLeads.filter((l) => l.priority === "hot").length;
  const callsThisWeek = callsSnap.size;
  const emailsSentThisWeek = emailsSnap.size;
  const quotationsSentThisWeek = quotesSnap.size;
  const allInvoices = invSnap.docs.map((d) => d.data());
  const invoicesUnpaid = allInvoices.filter((i) => i.status !== "paid" && i.status !== "cancelled" && i.status !== "draft").length;
  const revenueThisMonth = paySnap.docs.reduce((s, d) => s + Number(d.data().amount), 0);
  const overdueAmount = allInvoices.filter((i) => i.status === "overdue").reduce((s, i) => s + (Number(i.total) - Number(i.amountPaid)), 0);
  const openTasks = tasksSnap.size;
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const stockMovements = stocksSnap.docs.map((d) => d.data());
  const stockMap2 = /* @__PURE__ */ new Map();
  for (const s of stockMovements) {
    const itemId = s.itemId;
    const current = stockMap2.get(itemId) ?? 0;
    stockMap2.set(itemId, current + (s.direction === "in" ? Number(s.quantity) : -Number(s.quantity)));
  }
  let lowStockItems = 0;
  let stockValue = 0;
  for (const i of items) {
    const q = stockMap2.get(i.id) ?? 0;
    const thr = Number(i.lowStockThreshold);
    if (thr > 0 && q <= thr) lowStockItems += 1;
    if (q > 0) stockValue += q * Number(i.avgCost);
  }
  const openPOs = poSnap.docs.filter((d) => ["draft", "sent", "partial"].includes(d.data().status)).length;
  const result = {
    newLeadsToday,
    hotLeads,
    callsThisWeek,
    emailsSentThisWeek,
    quotationsSentThisWeek,
    invoicesUnpaid,
    revenueThisMonth,
    overdueAmount,
    openTasks,
    lowStockItems,
    openPurchaseOrders: openPOs,
    stockValue
  };
  cacheSet(cacheKey, result, DASHBOARD_CACHE_TTL);
  res.json(result);
});
var dashboard_widgets_default = dashboardWidgetsRouter;

// src/routes/items.ts
var import_express20 = require("express");
var db23 = () => getDb();
var itemsRouter = (0, import_express20.Router)();
async function stockMap(orgId, itemIds) {
  if (itemIds.length === 0) return /* @__PURE__ */ new Map();
  const snapshot = await db23().collection("stock_movements").where("organizationId", "==", orgId).where("itemId", "in", itemIds).get();
  const map = /* @__PURE__ */ new Map();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const itemId = data.itemId;
    const quantity = Number(data.quantity);
    const current = map.get(itemId) || 0;
    map.set(itemId, current + (data.direction === "in" ? quantity : -quantity));
  }
  return map;
}
function fmt9(i, currentStock = 0) {
  return {
    id: i.id,
    sku: i.sku,
    name: i.name,
    category: i.category ?? null,
    description: i.description ?? null,
    unit: i.unit,
    hsnCode: i.hsnCode ?? null,
    gstRate: Number(i.gstRate),
    salePrice: Number(i.salePrice),
    purchasePrice: Number(i.purchasePrice),
    avgCost: Number(i.avgCost),
    openingStock: Number(i.openingStock),
    lowStockThreshold: Number(i.lowStockThreshold),
    currentStock,
    isActive: i.isActive,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt
  };
}
itemsRouter.get("/items", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const snapshot = await db23().collection("items").where("organizationId", "==", orgId).get();
  const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  rows.sort((a, b) => a.name.localeCompare(b.name));
  const stocks = await stockMap(orgId, rows.map((r) => r.id));
  res.json(rows.map((r) => fmt9(r, stocks.get(r.id) ?? 0)));
});
itemsRouter.get("/items/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const doc = await db23().collection("items").doc(id).get();
  if (!doc.exists || doc.data().organizationId !== orgId) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  const i = { id: doc.id, ...doc.data() };
  const s = await stockMap(orgId, [id]);
  res.json(fmt9(i, s.get(id) ?? 0));
});
itemsRouter.post("/items", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const b = req.body ?? {};
  if (!b.sku || !b.name) {
    res.status(400).json({ error: "sku and name required" });
    return;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const docRef = await db23().collection("items").add({
    organizationId: orgId,
    sku: b.sku,
    name: b.name,
    category: b.category ?? null,
    description: b.description ?? null,
    unit: b.unit ?? "pcs",
    hsnCode: b.hsnCode ?? null,
    gstRate: b.gstRate != null ? String(b.gstRate) : "18",
    salePrice: b.salePrice != null ? String(b.salePrice) : "0",
    purchasePrice: b.purchasePrice != null ? String(b.purchasePrice) : "0",
    avgCost: b.purchasePrice != null ? String(b.purchasePrice) : "0",
    openingStock: b.openingStock != null ? String(b.openingStock) : "0",
    lowStockThreshold: b.lowStockThreshold != null ? String(b.lowStockThreshold) : "0",
    isActive: b.isActive ?? true,
    createdAt: now,
    updatedAt: now
  });
  const snap = await docRef.get();
  const i = { id: docRef.id, ...snap.data() };
  const opening = Number(b.openingStock ?? 0);
  if (opening > 0) {
    const warehouseId = await ensureDefaultWarehouse(orgId);
    await recordMovement({
      organizationId: orgId,
      itemId: i.id,
      warehouseId,
      direction: "in",
      quantity: opening,
      unitCost: Number(i.purchasePrice),
      reason: "opening",
      referenceType: "item",
      referenceId: i.id,
      createdById: req.user.userId
    });
  }
  await logAction(req, "CREATE", "item", i.id, `Created item ${i.sku}`);
  const s = await stockMap(orgId, [i.id]);
  res.status(201).json(fmt9(i, s.get(i.id) ?? 0));
});
itemsRouter.patch("/items/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const b = req.body ?? {};
  const docRef = db23().collection("items").doc(id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().organizationId !== orgId) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  const updates = { updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  for (const f of ["sku", "name", "category", "description", "unit", "hsnCode", "isActive"]) {
    if (b[f] !== void 0) updates[f] = b[f];
  }
  for (const f of ["gstRate", "salePrice", "purchasePrice", "lowStockThreshold"]) {
    if (b[f] !== void 0 && b[f] !== null) updates[f] = String(b[f]);
  }
  await docRef.update(updates);
  const i = { id: doc.id, ...doc.data(), ...updates };
  await logAction(req, "UPDATE", "item", id);
  const s = await stockMap(orgId, [id]);
  res.json(fmt9(i, s.get(id) ?? 0));
});
itemsRouter.delete("/items/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  await db23().collection("items").doc(id).delete();
  await logAction(req, "DELETE", "item", id);
  res.json({ message: "Item deleted" });
});
var items_default = itemsRouter;

// src/routes/warehouses.ts
var import_express21 = require("express");
var db24 = () => getDb();
var warehousesRouter = (0, import_express21.Router)();
function fmt10(w) {
  return {
    id: w.id,
    name: w.name,
    code: w.code ?? null,
    address: w.address ?? null,
    city: w.city ?? null,
    state: w.state ?? null,
    isDefault: w.isDefault,
    isActive: w.isActive,
    createdAt: w.createdAt
  };
}
warehousesRouter.get("/warehouses", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const snapshot = await db24().collection("warehouses").where("organizationId", "==", orgId).get();
  const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  rows.sort((a, b) => a.name.localeCompare(b.name));
  res.json(rows.map(fmt10));
});
warehousesRouter.post("/warehouses", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const b = req.body ?? {};
  if (!b.name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  if (b.isDefault) {
    const existing = await db24().collection("warehouses").where("organizationId", "==", orgId).where("isDefault", "==", true).get();
    const batch = db24().batch();
    for (const doc of existing.docs) {
      batch.update(doc.ref, { isDefault: false });
    }
    await batch.commit();
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const docRef = await db24().collection("warehouses").add({
    organizationId: orgId,
    name: b.name,
    code: b.code ?? null,
    address: b.address ?? null,
    city: b.city ?? null,
    state: b.state ?? null,
    isDefault: b.isDefault ?? false,
    isActive: b.isActive ?? true,
    createdAt: now
  });
  const snap = await docRef.get();
  const w = { id: docRef.id, ...snap.data() };
  await logAction(req, "CREATE", "warehouse", w.id, `Created warehouse ${w.name}`);
  res.status(201).json(fmt10(w));
});
warehousesRouter.patch("/warehouses/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const b = req.body ?? {};
  const docRef = db24().collection("warehouses").doc(id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().organizationId !== orgId) {
    res.status(404).json({ error: "Warehouse not found" });
    return;
  }
  if (b.isDefault) {
    const existing = await db24().collection("warehouses").where("organizationId", "==", orgId).where("isDefault", "==", true).get();
    const batch = db24().batch();
    for (const d of existing.docs) {
      batch.update(d.ref, { isDefault: false });
    }
    await batch.commit();
  }
  const updates = {};
  for (const f of ["name", "code", "address", "city", "state", "isDefault", "isActive"]) {
    if (b[f] !== void 0) updates[f] = b[f];
  }
  await docRef.update(updates);
  const w = { id: doc.id, ...doc.data(), ...updates };
  await logAction(req, "UPDATE", "warehouse", id);
  res.json(fmt10(w));
});
warehousesRouter.delete("/warehouses/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  await db24().collection("warehouses").doc(id).delete();
  await logAction(req, "DELETE", "warehouse", id);
  res.json({ message: "Warehouse deleted" });
});
var warehouses_default = warehousesRouter;

// src/routes/vendors.ts
var import_express22 = require("express");
var db25 = () => getDb();
var vendorsRouter = (0, import_express22.Router)();
function fmt11(v) {
  return {
    id: v.id,
    name: v.name,
    contactName: v.contactName ?? null,
    email: v.email ?? null,
    phone: v.phone ?? null,
    address: v.address ?? null,
    city: v.city ?? null,
    state: v.state ?? null,
    gstNumber: v.gstNumber ?? null,
    paymentTermsDays: v.paymentTermsDays,
    notes: v.notes ?? null,
    createdAt: v.createdAt
  };
}
vendorsRouter.get("/vendors", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const snapshot = await db25().collection("vendors").where("organizationId", "==", orgId).get();
  const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  rows.sort((a, b) => a.name.localeCompare(b.name));
  res.json(rows.map(fmt11));
});
vendorsRouter.get("/vendors/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const doc = await db25().collection("vendors").doc(id).get();
  if (!doc.exists || doc.data().organizationId !== orgId) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.json(fmt11({ id: doc.id, ...doc.data() }));
});
vendorsRouter.post("/vendors", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const b = req.body ?? {};
  if (!b.name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const docRef = await db25().collection("vendors").add({
    organizationId: orgId,
    name: b.name,
    contactName: b.contactName ?? null,
    email: b.email ?? null,
    phone: b.phone ?? null,
    address: b.address ?? null,
    city: b.city ?? null,
    state: b.state ?? null,
    gstNumber: b.gstNumber ?? null,
    paymentTermsDays: b.paymentTermsDays ?? 30,
    notes: b.notes ?? null,
    createdAt: now
  });
  const snap = await docRef.get();
  const v = { id: docRef.id, ...snap.data() };
  await logAction(req, "CREATE", "vendor", v.id, `Created vendor ${v.name}`);
  res.status(201).json(fmt11(v));
});
vendorsRouter.patch("/vendors/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const b = req.body ?? {};
  const docRef = db25().collection("vendors").doc(id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().organizationId !== orgId) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  const updates = {};
  for (const f of ["name", "contactName", "email", "phone", "address", "city", "state", "gstNumber", "paymentTermsDays", "notes"]) {
    if (b[f] !== void 0) updates[f] = b[f];
  }
  await docRef.update(updates);
  const v = { id: doc.id, ...doc.data(), ...updates };
  await logAction(req, "UPDATE", "vendor", id);
  res.json(fmt11(v));
});
vendorsRouter.delete("/vendors/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  await db25().collection("vendors").doc(id).delete();
  await logAction(req, "DELETE", "vendor", id);
  res.json({ message: "Vendor deleted" });
});
var vendors_default = vendorsRouter;

// src/routes/purchase-orders.ts
var import_express23 = require("express");
var db26 = () => getDb();
var purchaseOrdersRouter = (0, import_express23.Router)();
async function validateOwnership(orgId, b) {
  if (b.vendorId) {
    const vDoc = await db26().collection("vendors").doc(b.vendorId).get();
    if (!vDoc.exists || vDoc.data().organizationId !== orgId) return "Invalid vendor";
  }
  if (b.warehouseId) {
    const wDoc = await db26().collection("warehouses").doc(b.warehouseId).get();
    if (!wDoc.exists || wDoc.data().organizationId !== orgId) return "Invalid warehouse";
  }
  if (Array.isArray(b.items)) {
    const ids = Array.from(new Set(b.items.map((i) => i.itemId).filter((x) => x != null)));
    if (ids.length > 0) {
      const itemsSnap = await db26().collection("items").where("organizationId", "==", orgId).where("__name__", "in", ids).get();
      if (itemsSnap.size !== ids.length) return "One or more items not found in this organization";
    }
  }
  return null;
}
function genNumber3() {
  const d = /* @__PURE__ */ new Date();
  return `PO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9e3) + 1e3}`;
}
async function fmt12(p) {
  let vendorName = null;
  if (p.vendorId) {
    const vDoc = await db26().collection("vendors").doc(p.vendorId).get();
    if (vDoc.exists) vendorName = vDoc.data().name;
  }
  return {
    id: p.id,
    poNumber: p.poNumber,
    vendorId: p.vendorId ?? null,
    vendorName,
    warehouseId: p.warehouseId ?? null,
    status: p.status,
    expectedDate: p.expectedDate ?? null,
    subtotal: Number(p.subtotal),
    taxAmount: Number(p.taxAmount),
    total: Number(p.total),
    notes: p.notes ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
  };
}
async function recalc3(poId, taxRate = 18) {
  const itemsSnap = await db26().collection("purchase_order_items").where("purchaseOrderId", "==", poId).get();
  const items = itemsSnap.docs.map((d) => d.data());
  const subtotal = items.reduce((s, i) => s + Number(i.totalPrice), 0);
  const tax = subtotal * taxRate / 100;
  await db26().collection("purchase_orders").doc(poId).update({
    subtotal: subtotal.toFixed(2),
    taxAmount: tax.toFixed(2),
    total: (subtotal + tax).toFixed(2),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
purchaseOrdersRouter.get("/purchase-orders", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const snapshot = await db26().collection("purchase_orders").where("organizationId", "==", orgId).get();
  const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  res.json(await Promise.all(rows.map(fmt12)));
});
purchaseOrdersRouter.get("/purchase-orders/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const doc = await db26().collection("purchase_orders").doc(id).get();
  if (!doc.exists || doc.data().organizationId !== orgId) {
    res.status(404).json({ error: "Purchase order not found" });
    return;
  }
  const p = { id: doc.id, ...doc.data() };
  const itemsSnap = await db26().collection("purchase_order_items").where("purchaseOrderId", "==", id).get();
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const itemIds = items.map((i) => i.itemId).filter((x) => x != null);
  const itemsMap = /* @__PURE__ */ new Map();
  if (itemIds.length > 0) {
    const itemsSnap2 = await db26().collection("items").where("__name__", "in", itemIds).get();
    for (const d of itemsSnap2.docs) {
      itemsMap.set(d.id, { id: d.id, ...d.data() });
    }
  }
  res.json({
    ...await fmt12(p),
    items: items.map((i) => {
      const it = i.itemId ? itemsMap.get(i.itemId) : null;
      return {
        id: i.id,
        itemId: i.itemId ?? null,
        itemName: it?.name ?? null,
        itemSku: it?.sku ?? null,
        description: i.description,
        quantity: Number(i.quantity),
        receivedQuantity: Number(i.receivedQuantity),
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice)
      };
    })
  });
});
purchaseOrdersRouter.post("/purchase-orders", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const b = req.body ?? {};
  const ownershipErr = await validateOwnership(orgId, b);
  if (ownershipErr) {
    res.status(400).json({ error: ownershipErr });
    return;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const docRef = await db26().collection("purchase_orders").add({
    organizationId: orgId,
    poNumber: genNumber3(),
    vendorId: b.vendorId ?? null,
    warehouseId: b.warehouseId ?? null,
    status: b.status ?? "draft",
    expectedDate: b.expectedDate ?? null,
    notes: b.notes ?? null,
    createdById: req.user.userId,
    subtotal: "0",
    taxAmount: "0",
    total: "0",
    createdAt: now,
    updatedAt: now
  });
  if (Array.isArray(b.items) && b.items.length > 0) {
    const batch = db26().batch();
    for (const it of b.items) {
      const itemRef = db26().collection("purchase_order_items").doc();
      batch.set(itemRef, {
        purchaseOrderId: docRef.id,
        itemId: it.itemId ?? null,
        description: it.description,
        quantity: String(it.quantity),
        receivedQuantity: "0",
        unitPrice: String(it.unitPrice),
        totalPrice: (it.quantity * it.unitPrice).toFixed(2)
      });
    }
    await batch.commit();
    await recalc3(docRef.id, Number(b.taxRate ?? 18));
  }
  const uDoc = await db26().collection("purchase_orders").doc(docRef.id).get();
  await logAction(req, "CREATE", "purchase_order", docRef.id);
  res.status(201).json(await fmt12({ id: docRef.id, ...uDoc.data() }));
});
purchaseOrdersRouter.patch("/purchase-orders/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const b = req.body ?? {};
  const ownershipErr = await validateOwnership(orgId, b);
  if (ownershipErr) {
    res.status(400).json({ error: ownershipErr });
    return;
  }
  const docRef = db26().collection("purchase_orders").doc(id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().organizationId !== orgId) {
    res.status(404).json({ error: "Purchase order not found" });
    return;
  }
  const updates = { updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  for (const f of ["vendorId", "warehouseId", "status", "notes"]) {
    if (b[f] !== void 0) updates[f] = b[f];
  }
  if (b.expectedDate !== void 0) updates.expectedDate = b.expectedDate ? b.expectedDate : null;
  await docRef.update(updates);
  if (Array.isArray(b.items)) {
    const existingSnap = await db26().collection("purchase_order_items").where("purchaseOrderId", "==", id).get();
    const existing = existingSnap.docs.map((d) => d.data());
    const anyReceived = existing.some((p) => Number(p.receivedQuantity) > 0);
    if (anyReceived) {
      res.status(409).json({ error: "Cannot edit items on a purchase order that has received quantities" });
      return;
    }
    const batch = db26().batch();
    for (const d of existingSnap.docs) {
      batch.delete(d.ref);
    }
    if (b.items.length > 0) {
      for (const it of b.items) {
        const itemRef = db26().collection("purchase_order_items").doc();
        batch.set(itemRef, {
          purchaseOrderId: id,
          itemId: it.itemId ?? null,
          description: it.description,
          quantity: String(it.quantity),
          receivedQuantity: "0",
          unitPrice: String(it.unitPrice),
          totalPrice: (it.quantity * it.unitPrice).toFixed(2)
        });
      }
    }
    await batch.commit();
    await recalc3(id, Number(b.taxRate ?? 18));
  }
  const uDoc = await db26().collection("purchase_orders").doc(id).get();
  await logAction(req, "UPDATE", "purchase_order", id);
  res.json(await fmt12({ id: uDoc.id, ...uDoc.data() }));
});
var purchase_orders_default = purchaseOrdersRouter;

// src/routes/grn.ts
var import_express24 = require("express");
var db27 = () => getDb();
var grnRouter = (0, import_express24.Router)();
function genNumber4() {
  const d = /* @__PURE__ */ new Date();
  return `GRN-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9e3) + 1e3}`;
}
async function fmt13(g) {
  const itemsSnap = await db27().collection("grn_items").where("grnId", "==", g.id).get();
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const itemIds = items.map((i) => i.itemId).filter((x) => x != null);
  const itemsMap = /* @__PURE__ */ new Map();
  if (itemIds.length > 0) {
    const itemsSnap2 = await db27().collection("items").where("__name__", "in", itemIds).get();
    for (const d of itemsSnap2.docs) {
      itemsMap.set(d.id, { id: d.id, ...d.data() });
    }
  }
  let warehouseName = null;
  if (g.warehouseId) {
    const whDoc = await db27().collection("warehouses").doc(g.warehouseId).get();
    if (whDoc.exists) warehouseName = whDoc.data().name;
  }
  let poNumber = null;
  if (g.purchaseOrderId) {
    const poDoc = await db27().collection("purchase_orders").doc(g.purchaseOrderId).get();
    if (poDoc.exists) poNumber = poDoc.data().poNumber;
  }
  return {
    id: g.id,
    grnNumber: g.grnNumber,
    purchaseOrderId: g.purchaseOrderId ?? null,
    poNumber,
    warehouseId: g.warehouseId,
    warehouseName,
    receivedAt: g.receivedAt,
    notes: g.notes ?? null,
    items: items.map((i) => {
      const it = i.itemId ? itemsMap.get(i.itemId) : null;
      return {
        id: i.id,
        poItemId: i.poItemId ?? null,
        itemId: i.itemId,
        itemName: it?.name ?? null,
        itemSku: it?.sku ?? null,
        quantity: Number(i.quantity),
        unitCost: Number(i.unitCost)
      };
    }),
    createdAt: g.createdAt
  };
}
grnRouter.get("/grn", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const poId = req.query.purchaseOrderId;
  let snapshot;
  if (poId) {
    snapshot = await db27().collection("grn").where("organizationId", "==", orgId).where("purchaseOrderId", "==", poId).get();
  } else {
    snapshot = await db27().collection("grn").where("organizationId", "==", orgId).get();
  }
  const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  res.json(await Promise.all(rows.map(fmt13)));
});
grnRouter.post("/grn", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const b = req.body ?? {};
  if (!b.warehouseId || !Array.isArray(b.items) || b.items.length === 0) {
    res.status(400).json({ error: "warehouseId and items required" });
    return;
  }
  const whDoc = await db27().collection("warehouses").doc(b.warehouseId).get();
  if (!whDoc.exists || whDoc.data().organizationId !== orgId) {
    res.status(400).json({ error: "Invalid warehouse" });
    return;
  }
  let poItemIds = [];
  if (b.purchaseOrderId) {
    const poDoc = await db27().collection("purchase_orders").doc(b.purchaseOrderId).get();
    if (!poDoc.exists || poDoc.data().organizationId !== orgId) {
      res.status(400).json({ error: "Invalid purchase order" });
      return;
    }
    const poItemsSnap = await db27().collection("purchase_order_items").where("purchaseOrderId", "==", b.purchaseOrderId).get();
    poItemIds = poItemsSnap.docs.map((d) => d.id);
  }
  const incomingItems = b.items;
  const itemIdsToCheck = Array.from(new Set(incomingItems.map((i) => i.itemId)));
  if (itemIdsToCheck.length > 0) {
    const ownedItemsSnap = await db27().collection("items").where("organizationId", "==", orgId).where("__name__", "in", itemIdsToCheck).get();
    if (ownedItemsSnap.size !== itemIdsToCheck.length) {
      res.status(400).json({ error: "One or more items not found in this organization" });
      return;
    }
  }
  const poLinePending = /* @__PURE__ */ new Map();
  const poLineItem = /* @__PURE__ */ new Map();
  if (b.purchaseOrderId && poItemIds.length > 0) {
    const poLinesSnap = await db27().collection("purchase_order_items").where("purchaseOrderId", "==", b.purchaseOrderId).get();
    for (const d of poLinesSnap.docs) {
      const data = d.data();
      poLinePending.set(d.id, Number(data.quantity) - Number(data.receivedQuantity));
      poLineItem.set(d.id, data.itemId ?? null);
    }
  }
  for (const it of incomingItems) {
    if (it.poItemId && !poItemIds.includes(it.poItemId)) {
      res.status(400).json({ error: "Invalid PO line reference" });
      return;
    }
    if (it.poItemId) {
      const expected = poLineItem.get(it.poItemId);
      if (expected != null && expected !== it.itemId) {
        res.status(409).json({
          error: "GRN line item does not match the referenced PO line item",
          poItemId: it.poItemId,
          expectedItemId: expected,
          receivedItemId: it.itemId
        });
        return;
      }
    }
    if (!(it.quantity > 0)) {
      res.status(400).json({ error: "Quantity must be positive" });
      return;
    }
    if (it.poItemId) {
      const pending = poLinePending.get(it.poItemId) ?? 0;
      if (it.quantity > pending) {
        res.status(409).json({
          error: "Over-receipt is not allowed",
          poItemId: it.poItemId,
          pending,
          attempted: it.quantity
        });
        return;
      }
      poLinePending.set(it.poItemId, pending - it.quantity);
    }
  }
  let g;
  try {
    g = await db27().runTransaction(async (tx) => {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const grnRef = db27().collection("grn").doc();
      tx.set(grnRef, {
        organizationId: orgId,
        grnNumber: genNumber4(),
        purchaseOrderId: b.purchaseOrderId ?? null,
        warehouseId: b.warehouseId,
        receivedAt: b.receivedAt ?? now,
        notes: b.notes ?? null,
        createdById: req.user.userId,
        createdAt: now
      });
      for (const it of incomingItems) {
        const grnItemRef = db27().collection("grn_items").doc();
        tx.set(grnItemRef, {
          grnId: grnRef.id,
          poItemId: it.poItemId ?? null,
          itemId: it.itemId,
          quantity: String(it.quantity),
          unitCost: String(it.unitCost)
        });
        await recordMovement({
          organizationId: orgId,
          itemId: it.itemId,
          warehouseId: b.warehouseId,
          direction: "in",
          quantity: it.quantity,
          unitCost: it.unitCost,
          reason: "purchase",
          referenceType: "grn",
          referenceId: grnRef.id,
          createdById: req.user.userId,
          executor: tx
        });
        if (it.poItemId) {
          const poItemRef = db27().collection("purchase_order_items").doc(it.poItemId);
          const poItemSnap = await tx.get(poItemRef);
          const poItemData = poItemSnap.data();
          tx.update(poItemRef, {
            receivedQuantity: String(Number(poItemData.receivedQuantity) + it.quantity)
          });
        }
      }
      if (b.purchaseOrderId) {
        const poItemsSnap = await db27().collection("purchase_order_items").where("purchaseOrderId", "==", b.purchaseOrderId).get();
        const poItems = poItemsSnap.docs.map((d) => d.data());
        const allReceived = poItems.every(
          (p) => Number(p.receivedQuantity) >= Number(p.quantity)
        );
        const anyReceived = poItems.some((p) => Number(p.receivedQuantity) > 0);
        const newStatus = allReceived ? "received" : anyReceived ? "partial" : "sent";
        tx.update(db27().collection("purchase_orders").doc(b.purchaseOrderId), {
          status: newStatus,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      const snap = await tx.get(grnRef);
      return { id: grnRef.id, ...snap.data() };
    });
  } catch (e) {
    req.log.error({ err: e }, "GRN transaction failed");
    res.status(500).json({ error: "Failed to record goods receipt" });
    return;
  }
  await logAction(req, "CREATE", "grn", g.id, `Received ${b.items.length} items`);
  res.status(201).json(await fmt13(g));
});
var grn_default = grnRouter;

// src/routes/vendor-bills.ts
var import_express25 = require("express");
var db28 = () => getDb();
var vendorBillsRouter = (0, import_express25.Router)();
function genNumber5() {
  const d = /* @__PURE__ */ new Date();
  return `BILL-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9e3) + 1e3}`;
}
function deriveStatus(total, paid, dueDate, current) {
  if (current === "draft" || current === "cancelled") return current;
  if (paid >= total && total > 0) return "paid";
  if (dueDate && new Date(dueDate) < /* @__PURE__ */ new Date() && paid < total) return "overdue";
  if (paid > 0 && paid < total) return "partial";
  return "open";
}
async function fmt14(b) {
  let vendorName = null;
  if (b.vendorId) {
    const vDoc = await db28().collection("vendors").doc(b.vendorId).get();
    if (vDoc.exists) vendorName = vDoc.data().name;
  }
  return {
    id: b.id,
    billNumber: b.billNumber,
    vendorId: b.vendorId ?? null,
    vendorName,
    purchaseOrderId: b.purchaseOrderId ?? null,
    status: b.status,
    issueDate: b.issueDate,
    dueDate: b.dueDate ?? null,
    subtotal: Number(b.subtotal),
    taxAmount: Number(b.taxAmount),
    total: Number(b.total),
    amountPaid: Number(b.amountPaid),
    notes: b.notes ?? null,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt
  };
}
async function recalc4(billId, taxRate = 18) {
  const itemsSnap = await db28().collection("vendor_bill_items").where("vendorBillId", "==", billId).get();
  const items = itemsSnap.docs.map((d) => d.data());
  const subtotal = items.reduce((s, i) => s + Number(i.totalPrice), 0);
  const tax = subtotal * taxRate / 100;
  const total = subtotal + tax;
  const bDoc = await db28().collection("vendor_bills").doc(billId).get();
  const bData = bDoc.data();
  const status = deriveStatus(total, Number(bData.amountPaid), bData.dueDate, bData.status);
  await db28().collection("vendor_bills").doc(billId).update({
    subtotal: subtotal.toFixed(2),
    taxAmount: tax.toFixed(2),
    total: total.toFixed(2),
    status,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  const uDoc = await db28().collection("vendor_bills").doc(billId).get();
  const u = uDoc.data();
  const postable = u.status !== "draft" && u.status !== "cancelled" && Number(u.total) > 0;
  await reverseAndRepost(
    u.organizationId,
    "vendor_bill",
    billId,
    async () => {
      if (!postable) return null;
      const sub = Number(u.subtotal);
      const t = Number(u.taxAmount);
      const tot = Number(u.total);
      const lines = [
        { accountCode: "1200", debit: sub, description: `Vendor bill ${u.billNumber}` }
      ];
      if (t > 0) lines.push({ accountCode: "1300", debit: t, description: "GST input on bill" });
      lines.push({ accountCode: "2000", credit: tot, description: "Accounts payable" });
      return lines;
    },
    { entryDate: new Date(u.issueDate), memo: `Vendor bill ${u.billNumber}` }
  );
  const paid = Number(u.amountPaid ?? 0);
  await reverseAndRepost(
    u.organizationId,
    "vendor_bill_payment",
    billId,
    async () => {
      if (!postable || paid <= 0) return null;
      return [
        { accountCode: "2000", debit: paid, description: `Payment for bill ${u.billNumber}` },
        { accountCode: "1010", credit: paid, description: `Payment for bill ${u.billNumber}` }
      ];
    },
    { entryDate: /* @__PURE__ */ new Date(), memo: `Payment of vendor bill ${u.billNumber}` }
  );
}
vendorBillsRouter.get("/vendor-bills", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const snapshot = await db28().collection("vendor_bills").where("organizationId", "==", orgId).get();
  const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  res.json(await Promise.all(rows.map(fmt14)));
});
vendorBillsRouter.get("/vendor-bills/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const doc = await db28().collection("vendor_bills").doc(id).get();
  if (!doc.exists || doc.data().organizationId !== orgId) {
    res.status(404).json({ error: "Vendor bill not found" });
    return;
  }
  const b = { id: doc.id, ...doc.data() };
  const itemsSnap = await db28().collection("vendor_bill_items").where("vendorBillId", "==", id).get();
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json({
    ...await fmt14(b),
    items: items.map((i) => ({
      id: i.id,
      itemId: i.itemId ?? null,
      description: i.description,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice)
    }))
  });
});
vendorBillsRouter.post("/vendor-bills", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const b = req.body ?? {};
  let items = Array.isArray(b.items) ? b.items : [];
  if (b.vendorId) {
    const vDoc = await db28().collection("vendors").doc(b.vendorId).get();
    if (!vDoc.exists || vDoc.data().organizationId !== orgId) {
      res.status(400).json({ error: "Invalid vendor" });
      return;
    }
  }
  if (b.purchaseOrderId) {
    const poDoc = await db28().collection("purchase_orders").doc(b.purchaseOrderId).get();
    if (!poDoc.exists || poDoc.data().organizationId !== orgId) {
      res.status(400).json({ error: "Invalid purchase order" });
      return;
    }
  }
  if (b.purchaseOrderId && items.length === 0) {
    const poItemsSnap = await db28().collection("purchase_order_items").where("purchaseOrderId", "==", b.purchaseOrderId).get();
    items = poItemsSnap.docs.map((d) => {
      const p = d.data();
      return {
        itemId: p.itemId ?? void 0,
        description: p.description,
        quantity: Number(p.quantity),
        unitPrice: Number(p.unitPrice)
      };
    });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const docRef = await db28().collection("vendor_bills").add({
    organizationId: orgId,
    billNumber: b.billNumber ?? genNumber5(),
    vendorId: b.vendorId ?? null,
    purchaseOrderId: b.purchaseOrderId ?? null,
    status: b.status ?? "open",
    issueDate: b.issueDate ?? now,
    dueDate: b.dueDate ?? null,
    amountPaid: b.amountPaid != null ? String(b.amountPaid) : "0",
    notes: b.notes ?? null,
    createdById: req.user.userId,
    subtotal: "0",
    taxAmount: "0",
    total: "0",
    createdAt: now,
    updatedAt: now
  });
  if (items.length > 0) {
    const batch = db28().batch();
    for (const it of items) {
      const itemRef = db28().collection("vendor_bill_items").doc();
      batch.set(itemRef, {
        vendorBillId: docRef.id,
        itemId: it.itemId ?? null,
        description: it.description,
        quantity: String(it.quantity),
        unitPrice: String(it.unitPrice),
        totalPrice: (it.quantity * it.unitPrice).toFixed(2)
      });
    }
    await batch.commit();
    await recalc4(docRef.id, Number(b.taxRate ?? 18));
  }
  const uDoc = await db28().collection("vendor_bills").doc(docRef.id).get();
  await logAction(req, "CREATE", "vendor_bill", docRef.id);
  res.status(201).json(await fmt14({ id: docRef.id, ...uDoc.data() }));
});
vendorBillsRouter.patch("/vendor-bills/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const b = req.body ?? {};
  if (b.vendorId !== void 0 && b.vendorId !== null) {
    const vDoc = await db28().collection("vendors").doc(b.vendorId).get();
    if (!vDoc.exists || vDoc.data().organizationId !== orgId) {
      res.status(400).json({ error: "Invalid vendor" });
      return;
    }
  }
  if (b.purchaseOrderId !== void 0 && b.purchaseOrderId !== null) {
    const poDoc = await db28().collection("purchase_orders").doc(b.purchaseOrderId).get();
    if (!poDoc.exists || poDoc.data().organizationId !== orgId) {
      res.status(400).json({ error: "Invalid purchase order" });
      return;
    }
  }
  const docRef = db28().collection("vendor_bills").doc(id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().organizationId !== orgId) {
    res.status(404).json({ error: "Vendor bill not found" });
    return;
  }
  const updates = { updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  for (const f of ["billNumber", "vendorId", "purchaseOrderId", "status", "notes"]) {
    if (b[f] !== void 0) updates[f] = b[f];
  }
  if (b.dueDate !== void 0) updates.dueDate = b.dueDate ? b.dueDate : null;
  if (b.issueDate !== void 0) updates.issueDate = b.issueDate ? b.issueDate : (/* @__PURE__ */ new Date()).toISOString();
  if (b.amountPaid !== void 0 && b.amountPaid !== null) updates.amountPaid = String(b.amountPaid);
  await docRef.update(updates);
  if (Array.isArray(b.items)) {
    const existingSnap = await db28().collection("vendor_bill_items").where("vendorBillId", "==", id).get();
    const batch = db28().batch();
    for (const d of existingSnap.docs) {
      batch.delete(d.ref);
    }
    if (b.items.length > 0) {
      for (const it of b.items) {
        const itemRef = db28().collection("vendor_bill_items").doc();
        batch.set(itemRef, {
          vendorBillId: id,
          itemId: it.itemId ?? null,
          description: it.description,
          quantity: String(it.quantity),
          unitPrice: String(it.unitPrice),
          totalPrice: (it.quantity * it.unitPrice).toFixed(2)
        });
      }
    }
    await batch.commit();
  }
  await recalc4(id, Number(b.taxRate ?? 18));
  const uDoc = await db28().collection("vendor_bills").doc(id).get();
  await logAction(req, "UPDATE", "vendor_bill", id);
  res.json(await fmt14({ id: uDoc.id, ...uDoc.data() }));
});
var vendor_bills_default = vendorBillsRouter;

// src/routes/inventory.ts
var import_express26 = require("express");
var db29 = () => getDb();
var inventoryRouter = (0, import_express26.Router)();
inventoryRouter.get("/inventory/stock-levels", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const warehouseId = req.query.warehouseId;
  const itemId = req.query.itemId;
  let movementsSnap;
  if (warehouseId && itemId) {
    movementsSnap = await db29().collection("stock_movements").where("organizationId", "==", orgId).where("warehouseId", "==", warehouseId).where("itemId", "==", itemId).get();
  } else if (warehouseId) {
    movementsSnap = await db29().collection("stock_movements").where("organizationId", "==", orgId).where("warehouseId", "==", warehouseId).get();
  } else if (itemId) {
    movementsSnap = await db29().collection("stock_movements").where("organizationId", "==", orgId).where("itemId", "==", itemId).get();
  } else {
    movementsSnap = await db29().collection("stock_movements").where("organizationId", "==", orgId).get();
  }
  const stockMap2 = /* @__PURE__ */ new Map();
  for (const doc of movementsSnap.docs) {
    const data = doc.data();
    const iId = data.itemId;
    const wId = data.warehouseId;
    const quantity = Number(data.quantity);
    if (!stockMap2.has(iId)) stockMap2.set(iId, /* @__PURE__ */ new Map());
    const whMap2 = stockMap2.get(iId);
    const current = whMap2.get(wId) || 0;
    whMap2.set(wId, current + (data.direction === "in" ? quantity : -quantity));
  }
  const itemsSnap = await db29().collection("items").where("organizationId", "==", orgId).get();
  const itemMap = /* @__PURE__ */ new Map();
  for (const doc of itemsSnap.docs) {
    itemMap.set(doc.id, { id: doc.id, ...doc.data() });
  }
  const warehousesSnap = await db29().collection("warehouses").where("organizationId", "==", orgId).get();
  const whMap = /* @__PURE__ */ new Map();
  for (const doc of warehousesSnap.docs) {
    whMap.set(doc.id, { id: doc.id, ...doc.data() });
  }
  const result = [];
  for (const [iId, whQtyMap] of stockMap2) {
    const it = itemMap.get(iId);
    if (!it) continue;
    for (const [wId, q] of whQtyMap) {
      const wh = whMap.get(wId);
      if (!wh) continue;
      result.push({
        itemId: iId,
        itemSku: it.sku,
        itemName: it.name,
        unit: it.unit,
        warehouseId: wId,
        warehouseName: wh.name,
        quantity: q,
        avgCost: Number(it.avgCost),
        value: q * Number(it.avgCost)
      });
    }
  }
  res.json(result);
});
inventoryRouter.get("/inventory/movements", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const itemId = req.query.itemId;
  const warehouseId = req.query.warehouseId;
  let movementsSnap;
  if (itemId && warehouseId) {
    movementsSnap = await db29().collection("stock_movements").where("organizationId", "==", orgId).where("itemId", "==", itemId).where("warehouseId", "==", warehouseId).get();
  } else if (itemId) {
    movementsSnap = await db29().collection("stock_movements").where("organizationId", "==", orgId).where("itemId", "==", itemId).get();
  } else if (warehouseId) {
    movementsSnap = await db29().collection("stock_movements").where("organizationId", "==", orgId).where("warehouseId", "==", warehouseId).get();
  } else {
    movementsSnap = await db29().collection("stock_movements").where("organizationId", "==", orgId).get();
  }
  const rows = movementsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  const limited = rows.slice(0, 500);
  const itemsSnap = await db29().collection("items").where("organizationId", "==", orgId).get();
  const itemMap = /* @__PURE__ */ new Map();
  for (const doc of itemsSnap.docs) {
    itemMap.set(doc.id, { id: doc.id, ...doc.data() });
  }
  const warehousesSnap = await db29().collection("warehouses").where("organizationId", "==", orgId).get();
  const whMap = /* @__PURE__ */ new Map();
  for (const doc of warehousesSnap.docs) {
    whMap.set(doc.id, { id: doc.id, ...doc.data() });
  }
  res.json(
    limited.map((m) => {
      const it = itemMap.get(m.itemId);
      const wh = whMap.get(m.warehouseId);
      return {
        id: m.id,
        itemId: m.itemId,
        itemName: it?.name ?? null,
        itemSku: it?.sku ?? null,
        warehouseId: m.warehouseId,
        warehouseName: wh?.name ?? null,
        direction: m.direction,
        quantity: Number(m.quantity),
        unitCost: Number(m.unitCost),
        reason: m.reason,
        referenceType: m.referenceType ?? null,
        referenceId: m.referenceId ?? null,
        notes: m.notes ?? null,
        createdAt: m.createdAt
      };
    })
  );
});
inventoryRouter.post("/inventory/movements", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const b = req.body ?? {};
  if (!b.itemId || !b.warehouseId || !b.quantity || !b.direction || !b.reason) {
    res.status(400).json({ error: "itemId, warehouseId, quantity, direction, reason required" });
    return;
  }
  try {
    const m = await db29().runTransaction(async (tx) => {
      const out = await recordMovement({
        organizationId: orgId,
        itemId: b.itemId,
        warehouseId: b.warehouseId,
        direction: b.direction,
        quantity: Number(b.quantity),
        unitCost: b.unitCost != null ? Number(b.unitCost) : void 0,
        reason: b.reason,
        referenceType: "manual",
        notes: b.notes ?? null,
        createdById: req.user.userId,
        executor: tx
      });
      if (b.reason === "transfer_out" && b.transferToWarehouseId) {
        await recordMovement({
          organizationId: orgId,
          itemId: b.itemId,
          warehouseId: b.transferToWarehouseId,
          direction: "in",
          quantity: Number(b.quantity),
          unitCost: b.unitCost != null ? Number(b.unitCost) : void 0,
          reason: "transfer_in",
          referenceType: "transfer",
          referenceId: out.id,
          createdById: req.user.userId,
          executor: tx
        });
      }
      return out;
    });
    res.status(201).json({
      id: m.id,
      itemId: m.itemId,
      warehouseId: m.warehouseId,
      direction: m.direction,
      quantity: Number(m.quantity),
      unitCost: Number(m.unitCost),
      reason: m.reason,
      referenceType: m.referenceType ?? null,
      referenceId: m.referenceId ?? null,
      notes: m.notes ?? null,
      createdAt: m.createdAt
    });
  } catch (e) {
    req.log.error({ err: e }, "stock movement failed");
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed to record movement" });
  }
});
inventoryRouter.get("/inventory/valuation", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const movementsSnap = await db29().collection("stock_movements").where("organizationId", "==", orgId).get();
  const stockMap2 = /* @__PURE__ */ new Map();
  for (const doc of movementsSnap.docs) {
    const data = doc.data();
    const iId = data.itemId;
    const wId = data.warehouseId;
    const quantity = Number(data.quantity);
    if (!stockMap2.has(iId)) stockMap2.set(iId, /* @__PURE__ */ new Map());
    const whMap2 = stockMap2.get(iId);
    const current = whMap2.get(wId) || 0;
    whMap2.set(wId, current + (data.direction === "in" ? quantity : -quantity));
  }
  const itemsSnap = await db29().collection("items").where("organizationId", "==", orgId).get();
  const itemMap = /* @__PURE__ */ new Map();
  for (const doc of itemsSnap.docs) {
    itemMap.set(doc.id, { id: doc.id, ...doc.data() });
  }
  const warehousesSnap = await db29().collection("warehouses").where("organizationId", "==", orgId).get();
  const whMap = /* @__PURE__ */ new Map();
  for (const doc of warehousesSnap.docs) {
    whMap.set(doc.id, { id: doc.id, ...doc.data() });
  }
  let totalValue = 0;
  let totalItems = 0;
  const byWh = /* @__PURE__ */ new Map();
  const byCat = /* @__PURE__ */ new Map();
  for (const [iId, whQtyMap] of stockMap2) {
    const it = itemMap.get(iId);
    if (!it) continue;
    for (const [wId, qty] of whQtyMap) {
      const wh = whMap.get(wId);
      if (!wh) continue;
      if (qty <= 0) continue;
      const value = qty * Number(it.avgCost);
      totalValue += value;
      totalItems += 1;
      const w = byWh.get(wId) ?? { value: 0, items: 0, name: wh.name };
      w.value += value;
      w.items += 1;
      byWh.set(wId, w);
      const cat = it.category ?? "Uncategorized";
      const c = byCat.get(cat) ?? { value: 0, items: 0 };
      c.value += value;
      c.items += 1;
      byCat.set(cat, c);
    }
  }
  res.json({
    totalValue,
    totalItems,
    byWarehouse: Array.from(byWh.entries()).map(([id, v]) => ({
      warehouseId: id,
      warehouseName: v.name,
      value: v.value,
      items: v.items
    })),
    byCategory: Array.from(byCat.entries()).map(([category, v]) => ({
      category,
      value: v.value,
      items: v.items
    }))
  });
});
inventoryRouter.get("/inventory/low-stock", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const itemsSnap = await db29().collection("items").where("organizationId", "==", orgId).where("isActive", "==", true).get();
  const items = itemsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const stocksSnap = await db29().collection("stock_movements").where("organizationId", "==", orgId).get();
  const stockMap2 = /* @__PURE__ */ new Map();
  for (const doc of stocksSnap.docs) {
    const data = doc.data();
    const iId = data.itemId;
    const quantity = Number(data.quantity);
    const current = stockMap2.get(iId) || 0;
    stockMap2.set(iId, current + (data.direction === "in" ? quantity : -quantity));
  }
  const low = items.filter((i) => Number(i.lowStockThreshold) > 0).map((i) => ({
    itemId: i.id,
    itemSku: i.sku,
    itemName: i.name,
    unit: i.unit,
    currentStock: stockMap2.get(i.id) ?? 0,
    lowStockThreshold: Number(i.lowStockThreshold)
  })).filter((r) => r.currentStock <= r.lowStockThreshold);
  res.json(low);
});
var inventory_default = inventoryRouter;

// src/routes/social.ts
var import_express27 = require("express");

// src/lib/ai.ts
var MODEL = "claude-haiku-4-5";
function extractText(content) {
  const first = content[0];
  return first?.type === "text" ? first.text ?? "" : "";
}
function parseJsonFromText(text, fallback) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const arrStart = text.indexOf("[");
  const arrEnd = text.lastIndexOf("]");
  try {
    if (arrStart >= 0 && arrEnd > arrStart && (start < 0 || arrStart < start)) {
      return JSON.parse(text.slice(arrStart, arrEnd + 1));
    }
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
  } catch {
  }
  return fallback;
}
async function aiDraftSocialPost(opts) {
  const tone = opts.tone ?? "professional";
  const system = "You write social media posts for an Indian MSME. Respect platform conventions: LinkedIn longer + professional, Instagram short with emojis + hashtags, Facebook conversational. Return only JSON.";
  const user = `Write a ${tone} social post about: ${opts.prompt}${opts.context ? `

Context: ${opts.context}` : ""}

Return JSON with shape {"base": string, "variants": {"facebook": string, "instagram": string, "linkedin": string}}. Only include keys for these platforms: ${opts.platforms.join(
    ", "
  )}. Keep instagram under 220 chars and add 3-5 relevant hashtags. LinkedIn up to 800 chars, no hashtags.`;
  const msg = await getAnthropic().messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: user }]
  });
  const text = extractText(msg.content);
  const parsed = parseJsonFromText(text, {});
  const base = parsed.base ?? opts.prompt;
  const variants = {};
  for (const p of opts.platforms) variants[p] = parsed.variants?.[p] ?? base;
  return { base, variants };
}
async function aiRewriteTone(opts) {
  const msg = await getAnthropic().messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Rewrite this in a ${opts.tone} tone for an Indian MSME audience. Reply with just the rewritten text, no preface.

${opts.text}`
      }
    ]
  });
  return extractText(msg.content).trim();
}
async function aiDailyInsights(snap) {
  const fallback = {
    headline: "Run AI insights once Anthropic is configured.",
    bullets: [
      `${snap.newLeadsToday} new leads today, ${snap.hotLeads} hot.`,
      `${snap.invoicesUnpaid} unpaid invoices, \u20B9${snap.overdueAmount.toLocaleString("en-IN")} overdue.`,
      `${snap.lowStockItems} items below threshold.`
    ],
    suggestions: ["Reach out to hot leads first.", "Send reminders for overdue invoices."]
  };
  try {
    const msg = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: "You are an Indian MSME business operations analyst. Read the numbers and tell the owner where to focus today. Be direct, specific, and skip filler.",
      messages: [
        {
          role: "user",
          content: `Today's metrics (JSON):
${JSON.stringify(snap)}

Return JSON: {"headline": string (one sentence, the single most important thing to know today), "bullets": string[] (3-5 short observations grounded in the numbers), "suggestions": string[] (2-4 concrete next actions). All amounts use Indian Rupees with \u20B9 symbol.}`
        }
      ]
    });
    const text = extractText(msg.content);
    const parsed = parseJsonFromText(text, fallback);
    return {
      headline: parsed.headline || fallback.headline,
      bullets: parsed.bullets?.length ? parsed.bullets : fallback.bullets,
      suggestions: parsed.suggestions?.length ? parsed.suggestions : fallback.suggestions
    };
  } catch {
    return fallback;
  }
}
var ENTITY_FILTERS = {
  invoices: ["status", "minTotal", "maxTotal", "overdueOnly", "clientId"],
  leads: ["status", "priority", "source"],
  clients: ["state"],
  quotations: ["status", "minTotal", "maxTotal"],
  tasks: ["status", "priority"],
  items: ["lowStock", "category"]
};
async function aiPlanNlSearch(query) {
  const sys = `You translate a natural-language business query into a strict JSON plan. Valid entities: invoices, leads, clients, quotations, tasks, items. Allowed filters per entity: ${JSON.stringify(
    ENTITY_FILTERS
  )}. Numeric amounts are in Rupees. Return ONLY JSON with shape {"intent": string, "entity": string, "filters": object, "explanation": string}. Reject anything outside this set by returning entity:"invoices" filters:{} and an explanation.`;
  try {
    const msg = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 512,
      system: sys,
      messages: [{ role: "user", content: query }]
    });
    const text = extractText(msg.content);
    const parsed = parseJsonFromText(text, {});
    const entity = parsed.entity ?? "invoices";
    const allowed = ENTITY_FILTERS[entity] ?? [];
    const filters = {};
    for (const [k, v] of Object.entries(parsed.filters ?? {})) {
      if (allowed.includes(k) && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")) {
        filters[k] = v;
      }
    }
    return {
      intent: parsed.intent ?? query,
      entity,
      filters,
      explanation: parsed.explanation ?? ""
    };
  } catch {
    return { intent: query, entity: "invoices", filters: {}, explanation: "AI unavailable, defaulted to invoices." };
  }
}

// src/routes/social.ts
var db30 = () => getDb();
var SOCIAL_PLATFORMS = ["facebook", "instagram", "linkedin"];
var socialRouter = (0, import_express27.Router)();
function fmtAccount(a) {
  return {
    id: a.id,
    platform: a.platform,
    externalId: a.externalId,
    accountName: a.accountName,
    status: a.status,
    expiresAt: a.expiresAt ?? null,
    metadata: a.metadata ?? {},
    createdAt: a.createdAt,
    updatedAt: a.updatedAt
  };
}
function fmtPost(p, results = []) {
  return {
    id: p.id,
    content: p.content,
    mediaUrls: p.mediaUrls ?? [],
    platforms: p.platforms ?? [],
    variants: p.variants ?? {},
    status: p.status,
    scheduledAt: p.scheduledAt ?? null,
    publishedAt: p.publishedAt ?? null,
    context: p.context ?? {},
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    results: results.map((r) => ({
      id: r.id,
      platform: r.platform,
      status: r.status,
      externalId: r.externalId ?? null,
      externalUrl: r.externalUrl ?? null,
      error: r.error ?? null,
      publishedAt: r.publishedAt ?? null,
      metrics: r.metrics ?? {}
    }))
  };
}
socialRouter.get("/social/accounts", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const snap = await db30().collection("social_accounts").where("organizationId", "==", orgId).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(rows.map(fmtAccount));
});
socialRouter.post("/social/accounts", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const { platform, externalId, accountName, accessToken, refreshToken, expiresAt, metadata } = req.body ?? {};
  if (!platform || !SOCIAL_PLATFORMS.includes(platform) || !externalId || !accountName || !accessToken) {
    res.status(400).json({ error: "platform, externalId, accountName, accessToken required" });
    return;
  }
  const existingSnap = await db30().collection("social_accounts").where("organizationId", "==", orgId).where("platform", "==", platform).where("externalId", "==", externalId).limit(1).get();
  let row;
  if (!existingSnap.empty) {
    const doc = existingSnap.docs[0];
    await doc.ref.update({
      accountName,
      accessToken,
      refreshToken: refreshToken ?? null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      status: "active",
      metadata: metadata ?? {},
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const updated = await doc.ref.get();
    row = { id: updated.id, ...updated.data() };
  } else {
    const ref = await db30().collection("social_accounts").add({
      organizationId: orgId,
      platform,
      externalId,
      accountName,
      accessToken,
      refreshToken: refreshToken ?? null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      status: "active",
      metadata: metadata ?? {},
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const snap = await ref.get();
    row = { id: snap.id, ...snap.data() };
  }
  await logAction(req, "CONNECT", "social_account", row.id, `Platform ${platform}`);
  res.status(201).json(fmtAccount(row));
});
var oauthStates = /* @__PURE__ */ new Map();
function newStateToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function purgeOldStates() {
  const cutoff = Date.now() - 10 * 6e4;
  for (const [k, v] of oauthStates) if (v.createdAt < cutoff) oauthStates.delete(k);
}
function oauthConfig(platform) {
  const base = process.env.PUBLIC_APP_URL || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "");
  const redirectUri = `${base}/api/social/oauth/${platform}/callback`;
  if (platform === "facebook" || platform === "instagram") {
    return {
      clientId: process.env.META_APP_ID,
      clientSecret: process.env.META_APP_SECRET,
      redirectUri,
      authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
      tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
      scope: platform === "facebook" ? "pages_show_list,pages_manage_posts,pages_read_engagement" : "instagram_basic,instagram_content_publish,pages_show_list"
    };
  }
  return {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    redirectUri,
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scope: "openid profile email w_member_social r_organization_social w_organization_social rw_organization_admin"
  };
}
socialRouter.get("/social/oauth/config", requireAuth, (_req, res) => {
  res.json({
    facebook: !!process.env.META_APP_ID && !!process.env.META_APP_SECRET,
    instagram: !!process.env.META_APP_ID && !!process.env.META_APP_SECRET,
    linkedin: !!process.env.LINKEDIN_CLIENT_ID && !!process.env.LINKEDIN_CLIENT_SECRET
  });
});
socialRouter.get("/social/oauth/:platform/start", requireAuth, (req, res) => {
  purgeOldStates();
  const platform = req.params.platform;
  if (!SOCIAL_PLATFORMS.includes(platform)) {
    res.status(400).json({ error: "Unknown platform" });
    return;
  }
  const cfg = oauthConfig(platform);
  if (!cfg.clientId || !cfg.clientSecret) {
    res.status(400).json({ error: `OAuth not configured for ${platform}. Set ${platform === "linkedin" ? "LINKEDIN_CLIENT_ID/SECRET" : "META_APP_ID/SECRET"} env vars.` });
    return;
  }
  const state = newStateToken();
  oauthStates.set(state, { orgId: req.user.organizationId, platform, userId: req.user.userId, createdAt: Date.now() });
  const url = new URL(cfg.authorizeUrl);
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  url.searchParams.set("scope", cfg.scope);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  res.json({ authorizeUrl: url.toString() });
});
socialRouter.get("/social/oauth/:platform/callback", async (req, res) => {
  purgeOldStates();
  const platform = req.params.platform;
  const code = String(req.query.code ?? "");
  const stateToken = String(req.query.state ?? "");
  const stateEntry = oauthStates.get(stateToken);
  if (!stateEntry || stateEntry.platform !== platform) {
    res.status(400).send("Invalid or expired OAuth state. Please retry the connection from Settings \u2192 Integrations.");
    return;
  }
  oauthStates.delete(stateToken);
  const cfg = oauthConfig(platform);
  if (!cfg.clientId || !cfg.clientSecret) {
    res.status(400).send("OAuth not configured.");
    return;
  }
  try {
    const body = new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      code,
      grant_type: "authorization_code"
    });
    const tokenResp = await fetch(cfg.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    if (!tokenResp.ok) {
      const txt = await tokenResp.text().catch(() => "");
      res.status(502).send(`Token exchange failed: ${txt.slice(0, 500)}`);
      return;
    }
    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) {
      res.status(502).send("No access_token in OAuth response.");
      return;
    }
    let accessToken = tokenData.access_token;
    let externalId = "";
    let accountName = "";
    let expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1e3).toISOString() : null;
    const metadata = { connectedVia: "oauth" };
    if (platform === "facebook" || platform === "instagram") {
      try {
        const llParams = new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          fb_exchange_token: accessToken
        });
        const ll = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${llParams.toString()}`);
        if (ll.ok) {
          const lld = await ll.json();
          if (lld.access_token) accessToken = lld.access_token;
          if (lld.expires_in) expiresAt = new Date(Date.now() + lld.expires_in * 1e3).toISOString();
        }
      } catch {
      }
      const pagesResp = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(accessToken)}&fields=id,name,access_token,instagram_business_account`);
      const pagesData = await pagesResp.json();
      const page = pagesData.data?.[0];
      if (!page) {
        res.status(400).send("No Facebook Pages found on this account. Create or get admin access to a Page first.");
        return;
      }
      accessToken = page.access_token;
      metadata.fbPageId = page.id;
      metadata.fbPageName = page.name;
      if (platform === "facebook") {
        externalId = page.id;
        accountName = page.name;
      } else {
        if (!page.instagram_business_account?.id) {
          res.status(400).send("No Instagram Business account linked to your Facebook Page. Link one in Meta Business Suite first.");
          return;
        }
        externalId = page.instagram_business_account.id;
        accountName = `${page.name} (IG)`;
      }
    } else {
      const meResp = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
      const me = await meResp.json();
      const aclResp = await fetch(
        "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&projection=(elements*(organization~(id,localizedName)))",
        { headers: { Authorization: `Bearer ${accessToken}`, "X-Restli-Protocol-Version": "2.0.0" } }
      );
      if (aclResp.ok) {
        const acl = await aclResp.json();
        const first = acl.elements?.[0];
        if (first) {
          const orgUrn = first.organization || (first["organization~"]?.id ? `urn:li:organization:${first["organization~"]?.id}` : "");
          if (orgUrn) {
            externalId = orgUrn;
            accountName = first["organization~"]?.localizedName ?? "LinkedIn Page";
            metadata.linkedinAdminSub = me.sub;
          }
        }
      }
      if (!externalId) {
        if (!me.sub) {
          res.status(502).send("Could not load LinkedIn profile or any LinkedIn Pages.");
          return;
        }
        externalId = `urn:li:person:${me.sub}`;
        accountName = me.name ?? "LinkedIn personal profile";
        metadata.linkedinKind = "person";
      } else {
        metadata.linkedinKind = "organization";
      }
    }
    const existingSnap = await db30().collection("social_accounts").where("organizationId", "==", stateEntry.orgId).where("platform", "==", platform).where("externalId", "==", externalId).limit(1).get();
    if (!existingSnap.empty) {
      const doc = existingSnap.docs[0];
      await doc.ref.update({ accessToken, accountName, refreshToken: tokenData.refresh_token ?? null, expiresAt, status: "active", updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
    } else {
      await db30().collection("social_accounts").add({
        organizationId: stateEntry.orgId,
        platform,
        externalId,
        accountName,
        accessToken,
        refreshToken: tokenData.refresh_token ?? null,
        expiresAt,
        status: "active",
        metadata,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!doctype html><html><body style="font-family:system-ui;padding:2rem;background:#050816;color:#fff"><h2>${platform} connected \u2713</h2><p>You can close this window and return to MSME Pro.</p><script>window.opener&&window.opener.postMessage({type:"social-oauth-done",platform:"${platform}"},"*");setTimeout(()=>window.close(),500)</script></body></html>`);
  } catch (e) {
    res.status(502).send("OAuth callback failed: " + e.message);
  }
});
socialRouter.delete("/social/accounts/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const docSnap = await db30().collection("social_accounts").doc(id).get();
  if (docSnap.exists && docSnap.data().organizationId === orgId) {
    const acct = docSnap.data();
    try {
      if (acct.platform === "facebook" || acct.platform === "instagram") {
        await fetch(
          `https://graph.facebook.com/v19.0/${encodeURIComponent(acct.externalId)}/permissions?access_token=${encodeURIComponent(acct.accessToken)}`,
          { method: "DELETE", signal: AbortSignal.timeout(8e3) }
        );
      } else if (acct.platform === "linkedin") {
        await fetch("https://www.linkedin.com/oauth/v2/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: acct.accessToken,
            client_id: process.env.LINKEDIN_CLIENT_ID ?? "",
            client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? ""
          }),
          signal: AbortSignal.timeout(8e3)
        });
      }
    } catch (e) {
      req.log?.warn?.({ err: e }, "Provider revocation failed");
    }
    await docSnap.ref.delete();
  }
  await logAction(req, "DISCONNECT", "social_account", id);
  res.json({ message: "Account disconnected" });
});
socialRouter.post("/social/posts/:id/refresh-metrics", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const postSnap = await db30().collection("social_posts").doc(id).get();
  if (!postSnap.exists || postSnap.data().organizationId !== orgId) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  const postData = postSnap.data();
  const resultsSnap = await db30().collection("social_post_results").where("postId", "==", id).get();
  const results = resultsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const accountsSnap = await db30().collection("social_accounts").where("organizationId", "==", orgId).get();
  const accounts = accountsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  for (const r of results) {
    if (!r.externalId || r.status !== "posted") continue;
    const acct = accounts.find((a) => a.platform === r.platform);
    if (!acct) continue;
    try {
      let metrics = {};
      if (r.platform === "facebook") {
        const u = `https://graph.facebook.com/v19.0/${encodeURIComponent(r.externalId)}?fields=likes.summary(true),comments.summary(true),shares,reactions.summary(true)&access_token=${encodeURIComponent(acct.accessToken)}`;
        const fr = await fetch(u, { signal: AbortSignal.timeout(1e4) });
        if (fr.ok) {
          const d = await fr.json();
          metrics = {
            likes: d.likes?.summary?.total_count ?? 0,
            comments: d.comments?.summary?.total_count ?? 0,
            shares: d.shares?.count ?? 0,
            reactions: d.reactions?.summary?.total_count ?? 0
          };
        }
      } else if (r.platform === "instagram") {
        const u = `https://graph.facebook.com/v19.0/${encodeURIComponent(r.externalId)}?fields=like_count,comments_count&access_token=${encodeURIComponent(acct.accessToken)}`;
        const fr = await fetch(u, { signal: AbortSignal.timeout(1e4) });
        if (fr.ok) {
          const d = await fr.json();
          metrics = { likes: d.like_count ?? 0, comments: d.comments_count ?? 0 };
        }
        const ins = await fetch(
          `https://graph.facebook.com/v19.0/${encodeURIComponent(r.externalId)}/insights?metric=impressions,reach&access_token=${encodeURIComponent(acct.accessToken)}`,
          { signal: AbortSignal.timeout(1e4) }
        );
        if (ins.ok) {
          const id2 = await ins.json();
          for (const m of id2.data ?? []) {
            if (m.name && m.values?.[0]?.value != null) metrics[m.name] = m.values[0].value;
          }
        }
      } else if (r.platform === "linkedin") {
        const urn = encodeURIComponent(r.externalId);
        const sa = await fetch(`https://api.linkedin.com/v2/socialActions/${urn}`, {
          headers: { Authorization: `Bearer ${acct.accessToken}`, "X-Restli-Protocol-Version": "2.0.0" },
          signal: AbortSignal.timeout(1e4)
        });
        if (sa.ok) {
          const d = await sa.json();
          metrics = {
            likes: d.likesSummary?.totalLikes ?? 0,
            comments: d.commentsSummary?.aggregatedTotalComments ?? 0
          };
        }
      }
      await db30().collection("social_post_results").doc(r.id).update({ metrics });
    } catch (e) {
      req.log?.warn?.({ err: e, platform: r.platform }, "Metrics fetch failed");
    }
  }
  const refreshed = await db30().collection("social_post_results").where("postId", "==", id).get();
  const refreshedRows = refreshed.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(fmtPost({ id: postSnap.id, ...postData }, refreshedRows));
});
socialRouter.get("/social/posts", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const from = req.query.from ? new Date(String(req.query.from)).toISOString() : null;
  const to = req.query.to ? new Date(String(req.query.to)).toISOString() : null;
  let q = db30().collection("social_posts").where("organizationId", "==", orgId);
  if (from) q = q.where("createdAt", ">=", from);
  if (to) q = q.where("createdAt", "<=", to);
  const snap = await q.get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  const resultsSnap = await db30().collection("social_post_results").where("organizationId", "==", orgId).get();
  const allResults = resultsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const resultsByPost = /* @__PURE__ */ new Map();
  for (const r of allResults) {
    const arr = resultsByPost.get(r.postId) ?? [];
    arr.push(r);
    resultsByPost.set(r.postId, arr);
  }
  res.json(rows.map((r) => fmtPost(r, resultsByPost.get(r.id) ?? [])));
});
socialRouter.post("/social/posts", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const { content, platforms, variants, mediaUrls, scheduledAt, context, status } = req.body ?? {};
  if (!content || !Array.isArray(platforms) || platforms.length === 0) {
    res.status(400).json({ error: "content and at least one platform required" });
    return;
  }
  const validPlatforms = platforms.filter((p) => SOCIAL_PLATFORMS.includes(p));
  const ref = await db30().collection("social_posts").add({
    organizationId: orgId,
    content,
    mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
    platforms: validPlatforms,
    variants: variants ?? {},
    status: status === "scheduled" || scheduledAt ? "scheduled" : "draft",
    scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    context: context ?? {},
    createdById: req.user.userId,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  const snap = await ref.get();
  await logAction(req, "CREATE", "social_post", ref.id);
  res.status(201).json(fmtPost({ id: snap.id, ...snap.data() }));
});
socialRouter.patch("/social/posts/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const docSnap = await db30().collection("social_posts").doc(id).get();
  if (!docSnap.exists || docSnap.data().organizationId !== orgId) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  const updates = { updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  for (const f of ["content", "platforms", "variants", "mediaUrls", "context", "status"]) {
    if (req.body?.[f] !== void 0) updates[f] = req.body[f];
  }
  if (req.body?.scheduledAt !== void 0) {
    updates.scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt).toISOString() : null;
    if (req.body.scheduledAt && !updates.status) updates.status = "scheduled";
  }
  await db30().collection("social_posts").doc(id).update(updates);
  const updatedSnap = await db30().collection("social_posts").doc(id).get();
  res.json(fmtPost({ id: updatedSnap.id, ...updatedSnap.data() }));
});
socialRouter.delete("/social/posts/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const docSnap = await db30().collection("social_posts").doc(id).get();
  if (docSnap.exists && docSnap.data().organizationId === orgId) {
    await docSnap.ref.delete();
  }
  res.json({ message: "Post deleted" });
});
socialRouter.post("/social/posts/draft", requireAuth, async (req, res) => {
  const { prompt, platforms, tone, context } = req.body ?? {};
  if (!prompt || !Array.isArray(platforms) || platforms.length === 0) {
    res.status(400).json({ error: "prompt and platforms required" });
    return;
  }
  try {
    const drafted = await aiDraftSocialPost({
      prompt,
      platforms: platforms.filter(
        (p) => SOCIAL_PLATFORMS.includes(p)
      ),
      tone,
      context
    });
    res.json(drafted);
  } catch (e) {
    res.status(502).json({ error: "AI draft failed: " + e.message });
  }
});
socialRouter.post("/social/posts/rewrite", requireAuth, async (req, res) => {
  const { text, tone } = req.body ?? {};
  if (!text || !tone) {
    res.status(400).json({ error: "text and tone required" });
    return;
  }
  try {
    const rewritten = await aiRewriteTone({ text, tone });
    res.json({ text: rewritten });
  } catch (e) {
    res.status(502).json({ error: "AI rewrite failed: " + e.message });
  }
});
async function publishToPlatform(platform, content, mediaUrls, account) {
  try {
    if (platform === "facebook") {
      const payload = { message: content, access_token: account.accessToken };
      if (mediaUrls[0]) payload.link = mediaUrls[0];
      const r = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(account.externalId)}/feed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15e3)
        }
      );
      if (!r.ok) {
        const txt = await r.text().catch(() => `HTTP ${r.status}`);
        return { ok: false, error: txt.slice(0, 500) };
      }
      const data = await r.json();
      const extId = data.id ?? "";
      return { ok: true, externalId: extId, externalUrl: extId ? `https://facebook.com/${extId}` : void 0 };
    }
    if (platform === "instagram") {
      const imageUrl = mediaUrls.find((u) => /\.(jpe?g|png|webp)(\?|$)/i.test(u)) ?? mediaUrls[0];
      if (!imageUrl) {
        return { ok: false, error: "Instagram posts require at least one public image URL (jpg/png)." };
      }
      const containerParams = new URLSearchParams({
        image_url: imageUrl,
        caption: content,
        access_token: account.accessToken
      });
      const c = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(account.externalId)}/media?${containerParams.toString()}`,
        { method: "POST", signal: AbortSignal.timeout(2e4) }
      );
      if (!c.ok) {
        const txt = await c.text().catch(() => `HTTP ${c.status}`);
        return { ok: false, error: txt.slice(0, 500) };
      }
      const cd = await c.json();
      if (!cd.id) return { ok: false, error: "Instagram did not return a container id" };
      for (let i = 0; i < 5; i++) {
        const s = await fetch(
          `https://graph.facebook.com/v19.0/${encodeURIComponent(cd.id)}?fields=status_code&access_token=${encodeURIComponent(account.accessToken)}`
        );
        if (s.ok) {
          const sd = await s.json();
          if (sd.status_code === "FINISHED") break;
          if (sd.status_code === "ERROR" || sd.status_code === "EXPIRED") {
            return { ok: false, error: `Container status ${sd.status_code}` };
          }
        }
        await new Promise((r) => setTimeout(r, 2e3));
      }
      const publishParams = new URLSearchParams({ creation_id: cd.id, access_token: account.accessToken });
      const p = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(account.externalId)}/media_publish?${publishParams.toString()}`,
        { method: "POST", signal: AbortSignal.timeout(15e3) }
      );
      if (!p.ok) {
        const txt = await p.text().catch(() => `HTTP ${p.status}`);
        return { ok: false, error: txt.slice(0, 500) };
      }
      const pd = await p.json();
      return { ok: true, externalId: pd.id ?? "" };
    }
    if (platform === "linkedin") {
      const author = account.externalId.startsWith("urn:") ? account.externalId : account.externalId.match(/^[0-9]+$/) ? `urn:li:organization:${account.externalId}` : `urn:li:person:${account.externalId}`;
      const r = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${account.accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0"
        },
        body: JSON.stringify({
          author,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: content },
              shareMediaCategory: "NONE"
            }
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" }
        }),
        signal: AbortSignal.timeout(15e3)
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => `HTTP ${r.status}`);
        return { ok: false, error: txt.slice(0, 500) };
      }
      const headerId = r.headers.get("x-restli-id") ?? r.headers.get("x-linkedin-id") ?? "";
      let bodyId = "";
      try {
        const j = await r.json();
        bodyId = j.id ?? "";
      } catch {
      }
      const extId = headerId || bodyId;
      const extUrl = extId ? `https://www.linkedin.com/feed/update/${encodeURIComponent(extId)}` : void 0;
      return { ok: true, externalId: extId, externalUrl: extUrl };
    }
    return { ok: false, error: "Unknown platform" };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
async function publishPost(orgId, postId) {
  const postSnap = await db30().collection("social_posts").doc(postId).get();
  if (!postSnap.exists || postSnap.data().organizationId !== orgId) return;
  const postData = postSnap.data();
  await db30().collection("social_posts").doc(postId).update({ status: "publishing", updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  const accountsSnap = await db30().collection("social_accounts").where("organizationId", "==", orgId).where("status", "==", "active").get();
  const accounts = accountsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const results = [];
  for (const platform of postData.platforms) {
    const acct = accounts.find((a) => a.platform === platform);
    const text = postData.variants[platform] ?? postData.content;
    if (!acct) {
      results.push({ platform, ok: false, error: `No connected ${platform} account` });
      continue;
    }
    const r = await publishToPlatform(platform, text, postData.mediaUrls ?? [], acct);
    results.push({ platform, ...r });
  }
  const oldResults = await db30().collection("social_post_results").where("postId", "==", postId).get();
  for (const doc of oldResults.docs) {
    await doc.ref.delete();
  }
  for (const r of results) {
    await db30().collection("social_post_results").add({
      postId,
      organizationId: orgId,
      platform: r.platform,
      status: r.ok ? "posted" : "failed",
      externalId: r.externalId ?? null,
      externalUrl: r.externalUrl ?? null,
      error: r.error ?? null,
      publishedAt: r.ok ? (/* @__PURE__ */ new Date()).toISOString() : null,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  const okCount = results.filter((r) => r.ok).length;
  const status = okCount === results.length ? "posted" : okCount === 0 ? "failed" : "partial";
  await db30().collection("social_posts").doc(postId).update({
    status,
    publishedAt: okCount > 0 ? (/* @__PURE__ */ new Date()).toISOString() : null,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
socialRouter.post("/social/posts/:id/publish", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  await publishPost(orgId, id);
  const postSnap = await db30().collection("social_posts").doc(id).get();
  if (!postSnap.exists || postSnap.data().organizationId !== orgId) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  const row = { id: postSnap.id, ...postSnap.data() };
  const resultsSnap = await db30().collection("social_post_results").where("postId", "==", id).get();
  const results = resultsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  await logAction(req, "PUBLISH", "social_post", id, `Status ${row.status}`);
  res.json(fmtPost(row, results));
});
socialRouter.get("/social/calendar", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const snap = await db30().collection("social_posts").where("organizationId", "==", orgId).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (b.scheduledAt ?? "").localeCompare(a.scheduledAt ?? ""));
  res.json(
    rows.map((p) => ({
      id: p.id,
      content: p.content.slice(0, 80),
      platforms: p.platforms ?? [],
      status: p.status,
      scheduledAt: p.scheduledAt ?? null,
      publishedAt: p.publishedAt ?? null
    }))
  );
});
var social_default = socialRouter;

// src/routes/marketing.ts
var import_express28 = require("express");
var import_node_crypto2 = __toESM(require("node:crypto"), 1);
var db31 = () => getDb();
var marketingRouter = (0, import_express28.Router)();
function fmtSuppression(s) {
  return {
    id: s.id,
    email: s.email,
    reason: s.reason,
    createdAt: s.createdAt
  };
}
function fmtSequence(s, steps = []) {
  return {
    id: s.id,
    name: s.name,
    description: s.description ?? null,
    trigger: s.trigger,
    fromEmail: s.fromEmail,
    status: s.status,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    steps: steps.sort((a, b) => a.stepOrder - b.stepOrder).map((st) => ({
      id: st.id,
      stepOrder: st.stepOrder,
      delayDays: st.delayDays,
      subject: st.subject,
      body: st.body
    }))
  };
}
marketingRouter.get("/marketing/suppressions", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const snap = await db31().collection("email_suppressions").where("organizationId", "==", orgId).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  res.json(rows.map(fmtSuppression));
});
marketingRouter.post("/marketing/suppressions", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const { email, reason } = req.body ?? {};
  if (!email) {
    res.status(400).json({ error: "email required" });
    return;
  }
  const existingSnap = await db31().collection("email_suppressions").where("organizationId", "==", orgId).where("email", "==", email).limit(1).get();
  if (!existingSnap.empty) {
    const doc = existingSnap.docs[0];
    res.json(fmtSuppression({ id: doc.id, ...doc.data() }));
    return;
  }
  const ref = await db31().collection("email_suppressions").add({
    organizationId: orgId,
    email,
    reason: reason ?? "manual",
    unsubscribeToken: import_node_crypto2.default.randomBytes(16).toString("hex"),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  const snap = await ref.get();
  await logAction(req, "CREATE", "email_suppression", ref.id, email);
  res.status(201).json(fmtSuppression({ id: snap.id, ...snap.data() }));
});
marketingRouter.delete("/marketing/suppressions/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const docSnap = await db31().collection("email_suppressions").doc(id).get();
  if (docSnap.exists && docSnap.data().organizationId === orgId) {
    await docSnap.ref.delete();
  }
  res.json({ message: "Removed" });
});
marketingRouter.get("/marketing/drips", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const snap = await db31().collection("drip_sequences").where("organizationId", "==", orgId).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  let allSteps = [];
  if (rows.length) {
    const stepsSnap = await db31().collection("drip_steps").get();
    allSteps = stepsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  const byId = /* @__PURE__ */ new Map();
  for (const s of allSteps) {
    const seqId = s.sequenceId;
    const arr = byId.get(seqId) ?? [];
    arr.push(s);
    byId.set(seqId, arr);
  }
  res.json(rows.map((r) => fmtSequence(r, byId.get(r.id) ?? [])));
});
marketingRouter.post("/marketing/drips", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const { name, description, trigger, fromEmail, steps } = req.body ?? {};
  if (!name || !trigger || !fromEmail) {
    res.status(400).json({ error: "name, trigger, fromEmail required" });
    return;
  }
  const seqRef = await db31().collection("drip_sequences").add({
    organizationId: orgId,
    name,
    description: description ?? null,
    trigger,
    fromEmail,
    status: "draft",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (Array.isArray(steps)) {
    for (const [i, step] of steps.entries()) {
      await db31().collection("drip_steps").add({
        sequenceId: seqRef.id,
        stepOrder: i,
        delayDays: Number(step.delayDays ?? 0),
        subject: String(step.subject ?? ""),
        body: String(step.body ?? "")
      });
    }
  }
  await logAction(req, "CREATE", "drip_sequence", seqRef.id);
  const stepsSnap = await db31().collection("drip_steps").where("sequenceId", "==", seqRef.id).get();
  const stepRows = stepsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const seqSnap = await db31().collection("drip_sequences").doc(seqRef.id).get();
  res.status(201).json(fmtSequence({ id: seqSnap.id, ...seqSnap.data() }, stepRows));
});
marketingRouter.patch("/marketing/drips/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const seqSnap = await db31().collection("drip_sequences").doc(id).get();
  if (!seqSnap.exists || seqSnap.data().organizationId !== orgId) {
    res.status(404).json({ error: "Sequence not found" });
    return;
  }
  const updates = { updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  for (const f of ["name", "description", "trigger", "fromEmail", "status"]) {
    if (req.body?.[f] !== void 0) updates[f] = req.body[f];
  }
  await db31().collection("drip_sequences").doc(id).update(updates);
  if (Array.isArray(req.body?.steps)) {
    const oldSteps = await db31().collection("drip_steps").where("sequenceId", "==", id).get();
    for (const doc of oldSteps.docs) {
      await doc.ref.delete();
    }
    for (const [i, step] of req.body.steps.entries()) {
      await db31().collection("drip_steps").add({
        sequenceId: id,
        stepOrder: i,
        delayDays: Number(step.delayDays ?? 0),
        subject: String(step.subject ?? ""),
        body: String(step.body ?? "")
      });
    }
  }
  const updatedSnap = await db31().collection("drip_sequences").doc(id).get();
  const stepsSnap = await db31().collection("drip_steps").where("sequenceId", "==", id).get();
  const stepRows = stepsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(fmtSequence({ id: updatedSnap.id, ...updatedSnap.data() }, stepRows));
});
marketingRouter.post("/marketing/drips/:id/enroll", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const seqSnap = await db31().collection("drip_sequences").doc(id).get();
  if (!seqSnap.exists || seqSnap.data().organizationId !== orgId) {
    res.status(404).json({ error: "Sequence not found" });
    return;
  }
  const seqData = seqSnap.data();
  const seqTrigger = seqData.trigger ?? {};
  const filters = seqTrigger.filters ?? {};
  let candidates = [];
  if (seqTrigger.entity === "leads") {
    const leadsSnap = await db31().collection("leads").where("organizationId", "==", orgId).get();
    candidates = leadsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => filters.status ? r.status === filters.status : true).filter((r) => filters.priority ? r.priority === filters.priority : true).map((r) => ({ email: r.email, name: r.name, leadId: r.id, clientId: null }));
  } else {
    const clientsSnap = await db31().collection("clients").where("organizationId", "==", orgId).get();
    candidates = clientsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).map((r) => ({ email: r.email, name: r.name, leadId: null, clientId: r.id }));
  }
  let enrolled = 0;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const c of candidates) {
    if (!c.email) continue;
    const existingSnap = await db31().collection("drip_enrollments").where("sequenceId", "==", id).where("email", "==", c.email).limit(1).get();
    if (!existingSnap.empty) continue;
    await db31().collection("drip_enrollments").add({
      organizationId: orgId,
      sequenceId: id,
      leadId: c.leadId,
      clientId: c.clientId,
      email: c.email,
      name: c.name,
      currentStep: 0,
      status: "active",
      nextSendAt: now,
      createdAt: now,
      updatedAt: now
    });
    enrolled += 1;
  }
  await db31().collection("drip_sequences").doc(id).update({ status: "active", updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  await logAction(req, "ENROLL", "drip_sequence", id, `Enrolled ${enrolled}`);
  res.json({ enrolled });
});
marketingRouter.get("/marketing/unsubscribe/:token", async (req, res) => {
  const snap = await db31().collection("email_suppressions").where("unsubscribeToken", "==", req.params.token).limit(1).get();
  if (snap.empty) {
    res.status(404).json({ error: "Invalid unsubscribe link" });
    return;
  }
  const doc = snap.docs[0];
  const data = doc.data();
  res.json({ email: data.email, status: data.reason });
});
marketingRouter.post("/marketing/unsubscribe/:token", async (req, res) => {
  const snap = await db31().collection("email_suppressions").where("unsubscribeToken", "==", req.params.token).limit(1).get();
  if (snap.empty) {
    res.status(404).json({ error: "Invalid unsubscribe link" });
    return;
  }
  const doc = snap.docs[0];
  const data = doc.data();
  await doc.ref.update({ reason: "unsubscribe" });
  const enrollSnap = await db31().collection("drip_enrollments").where("organizationId", "==", data.organizationId).where("email", "==", data.email).where("status", "==", "active").get();
  for (const e of enrollSnap.docs) {
    await e.ref.update({ status: "stopped", updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  }
  res.json({ message: "You have been unsubscribed." });
});
var marketing_default = marketingRouter;

// src/routes/ai.ts
var import_express29 = require("express");
var db32 = () => getDb();
var aiRouter = (0, import_express29.Router)();
function todayKey() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
aiRouter.get("/ai/insights", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const forDate = String(req.query.date ?? todayKey());
  const cachedSnap = await db32().collection("ai_insights").where("organizationId", "==", orgId).where("forDate", "==", forDate).limit(1).get();
  if (!cachedSnap.empty && req.query.refresh !== "1") {
    const cached = cachedSnap.docs[0].data();
    let insightsBundle = cached.insights;
    if (typeof insightsBundle === "string") {
      try {
        insightsBundle = JSON.parse(insightsBundle);
      } catch {
      }
    }
    res.json({
      forDate: cached.forDate,
      insights: insightsBundle && typeof insightsBundle === "object" && insightsBundle.headline ? insightsBundle : null,
      metricsSnapshot: cached.metricsSnapshot,
      cached: true
    });
    return;
  }
  const now = /* @__PURE__ */ new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 864e5).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const leadsSnap = await db32().collection("leads").where("organizationId", "==", orgId).get();
  const allLeads = leadsSnap.docs.map((d) => d.data());
  const newLeadsToday = allLeads.filter((l) => l.createdAt >= startOfDay).length;
  const hotLeads = allLeads.filter((l) => l.priority === "hot").length;
  const invSnap = await db32().collection("invoices").where("organizationId", "==", orgId).get();
  const allInvoices = invSnap.docs.map((d) => d.data());
  const invoicesUnpaid = allInvoices.filter((i) => !["paid", "cancelled", "draft"].includes(i.status)).length;
  const overdueAmount = allInvoices.filter((i) => i.status === "overdue").reduce((s, i) => s + (Number(i.total) - Number(i.amountPaid)), 0);
  const tasksSnap = await db32().collection("tasks").where("organizationId", "==", orgId).get();
  const openTasks = tasksSnap.docs.filter((d) => d.data().status === "open").length;
  const quotesSnap = await db32().collection("quotations").where("organizationId", "==", orgId).get();
  const quotesWeek = quotesSnap.docs.filter((d) => d.data().createdAt >= weekAgo).length;
  const revenueThisMonth = allInvoices.filter((i) => i.updatedAt >= monthStart).reduce((s, i) => s + Number(i.amountPaid), 0);
  const itemsSnap = await db32().collection("items").where("organizationId", "==", orgId).where("isActive", "==", true).get();
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const stocksSnap = await db32().collection("stock_movements").where("organizationId", "==", orgId).get();
  const stockMovements = stocksSnap.docs.map((d) => d.data());
  const stockMap2 = /* @__PURE__ */ new Map();
  for (const s of stockMovements) {
    const itemId = s.itemId;
    const current = stockMap2.get(itemId) ?? 0;
    stockMap2.set(itemId, current + (s.direction === "in" ? Number(s.quantity) : -Number(s.quantity)));
  }
  let lowStockItems = 0;
  let stockValue = 0;
  for (const i of items) {
    const q = stockMap2.get(i.id) ?? 0;
    const thr = Number(i.lowStockThreshold);
    if (thr > 0 && q <= thr) lowStockItems += 1;
    if (q > 0) stockValue += q * Number(i.avgCost);
  }
  const sourceMap = /* @__PURE__ */ new Map();
  for (const l of allLeads) {
    const src = l.source;
    const entry = sourceMap.get(src) ?? { total: 0, won: 0 };
    entry.total += 1;
    if (l.status === "won") entry.won += 1;
    sourceMap.set(src, entry);
  }
  let topSource = "";
  let topConv = 0;
  for (const [src, entry] of sourceMap) {
    const conv = entry.total > 0 ? entry.won / entry.total * 100 : 0;
    if (conv > topConv) {
      topConv = conv;
      topSource = src;
    }
  }
  const snap = {
    newLeadsToday,
    hotLeads,
    callsThisWeek: 0,
    emailsSentThisWeek: 0,
    quotationsSentThisWeek: quotesWeek,
    invoicesUnpaid,
    revenueThisMonth,
    overdueAmount,
    openTasks,
    lowStockItems,
    openPurchaseOrders: 0,
    stockValue,
    topLeadSource: topSource || void 0,
    topLeadSourceConversion: Math.round(topConv)
  };
  const insights = await aiDailyInsights(snap);
  const existingSnap = await db32().collection("ai_insights").where("organizationId", "==", orgId).where("forDate", "==", forDate).limit(1).get();
  let row;
  if (!existingSnap.empty) {
    const doc = existingSnap.docs[0];
    await doc.ref.update({ insights, metricsSnapshot: snap, createdAt: (/* @__PURE__ */ new Date()).toISOString() });
    const updated = await doc.ref.get();
    row = { id: updated.id, ...updated.data() };
  } else {
    const ref = await db32().collection("ai_insights").add({
      organizationId: orgId,
      forDate,
      insights,
      metricsSnapshot: snap,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const s = await ref.get();
    row = { id: s.id, ...s.data() };
  }
  res.json({
    forDate: row.forDate,
    insights: row.insights && typeof row.insights === "object" && row.insights.headline ? row.insights : null,
    metricsSnapshot: row.metricsSnapshot,
    cached: false
  });
});
aiRouter.post("/ai/nl-search", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const q = String(req.body?.query ?? "").trim();
  if (!q) {
    res.status(400).json({ error: "query required" });
    return;
  }
  const plan = await aiPlanNlSearch(q);
  let results = [];
  const limit = 25;
  try {
    if (plan.entity === "invoices") {
      const snap = await db32().collection("invoices").where("organizationId", "==", orgId).limit(200).get();
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
      results = rows.filter((r) => plan.filters.status ? r.status === plan.filters.status : true).filter((r) => plan.filters.minTotal ? Number(r.total) >= Number(plan.filters.minTotal) : true).filter((r) => plan.filters.maxTotal ? Number(r.total) <= Number(plan.filters.maxTotal) : true).filter((r) => plan.filters.overdueOnly ? r.status === "overdue" : true).filter((r) => plan.filters.clientId ? r.clientId === plan.filters.clientId : true).slice(0, limit).map((r) => ({
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        status: r.status,
        total: Number(r.total),
        amountPaid: Number(r.amountPaid),
        dueAt: r.dueDate ?? null,
        link: `/invoices/${r.id}`
      }));
    } else if (plan.entity === "leads") {
      const snap = await db32().collection("leads").where("organizationId", "==", orgId).limit(200).get();
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
      results = rows.filter((r) => plan.filters.status ? r.status === plan.filters.status : true).filter((r) => plan.filters.priority ? r.priority === plan.filters.priority : true).filter((r) => plan.filters.source ? r.source === plan.filters.source : true).slice(0, limit).map((r) => ({
        id: r.id,
        name: r.name,
        company: r.company,
        priority: r.priority,
        status: r.status,
        source: r.source,
        link: `/leads/${r.id}`
      }));
    } else if (plan.entity === "clients") {
      const snap = await db32().collection("clients").where("organizationId", "==", orgId).limit(200).get();
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
      results = rows.filter((r) => plan.filters.state ? r.state === plan.filters.state : true).slice(0, limit).map((r) => ({ id: r.id, name: r.name, company: r.company, email: r.email, link: `/clients` }));
    } else if (plan.entity === "quotations") {
      const snap = await db32().collection("quotations").where("organizationId", "==", orgId).limit(200).get();
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
      results = rows.filter((r) => plan.filters.status ? r.status === plan.filters.status : true).filter((r) => plan.filters.minTotal ? Number(r.total) >= Number(plan.filters.minTotal) : true).filter((r) => plan.filters.maxTotal ? Number(r.total) <= Number(plan.filters.maxTotal) : true).slice(0, limit).map((r) => ({
        id: r.id,
        quotationNumber: r.quotationNumber,
        status: r.status,
        total: Number(r.total),
        link: `/quotations/${r.id}`
      }));
    } else if (plan.entity === "tasks") {
      const snap = await db32().collection("tasks").where("organizationId", "==", orgId).limit(200).get();
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
      results = rows.filter((r) => plan.filters.status ? r.status === plan.filters.status : true).filter((r) => plan.filters.priority ? r.priority === plan.filters.priority : true).slice(0, limit).map((r) => ({ id: r.id, title: r.title, status: r.status, priority: r.priority, link: `/tasks` }));
    } else if (plan.entity === "items") {
      const snap = await db32().collection("items").where("organizationId", "==", orgId).limit(200).get();
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const stocksAllSnap = await db32().collection("stock_movements").where("organizationId", "==", orgId).get();
      const stockMovements = stocksAllSnap.docs.map((d) => d.data());
      const m = /* @__PURE__ */ new Map();
      for (const s of stockMovements) {
        const itemId = s.itemId;
        const current = m.get(itemId) ?? 0;
        m.set(itemId, current + (s.direction === "in" ? Number(s.quantity) : -Number(s.quantity)));
      }
      results = rows.filter((r) => plan.filters.category ? r.category === plan.filters.category : true).filter((r) => {
        if (!plan.filters.lowStock) return true;
        const q2 = m.get(r.id) ?? 0;
        return q2 <= Number(r.lowStockThreshold);
      }).slice(0, limit).map((r) => ({ id: r.id, name: r.name, sku: r.sku, stock: m.get(r.id) ?? 0, link: `/items` }));
    }
  } catch (e) {
    res.status(500).json({ error: "Search failed: " + e.message });
    return;
  }
  res.json({ plan, results });
});
var ai_default = aiRouter;

// src/routes/reports-r4.ts
var import_express30 = require("express");
var import_exceljs = __toESM(require("exceljs"), 1);
var import_pdfkit = __toESM(require("pdfkit"), 1);
var db33 = () => getDb();
var reportsR4Router = (0, import_express30.Router)();
function parseDateRange(req) {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date((/* @__PURE__ */ new Date()).getFullYear(), 0, 1);
  const to = req.query.to ? new Date(String(req.query.to)) : /* @__PURE__ */ new Date();
  return { from, to };
}
function toCsv(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}
async function sendXlsx(res, name, rows) {
  const wb = new import_exceljs.default.Workbook();
  const ws = wb.addWorksheet(name.slice(0, 31));
  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    ws.columns = headers.map((h) => ({ header: h, key: h, width: Math.max(12, Math.min(40, h.length + 4)) }));
    ws.getRow(1).font = { bold: true };
    for (const r of rows) ws.addRow(r);
  } else {
    ws.addRow(["(no data)"]);
  }
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${name}.xlsx"`);
  const buf = await wb.xlsx.writeBuffer();
  res.end(Buffer.from(buf));
}
function sendPdf(res, name, label, rows) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${name}.pdf"`);
  const doc = new import_pdfkit.default({ size: "A4", margin: 36, layout: "landscape" });
  doc.pipe(res);
  doc.fontSize(16).text(label, { align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor("#555").text(`Generated ${(/* @__PURE__ */ new Date()).toLocaleString()}`);
  doc.moveDown(0.6).fillColor("black");
  if (rows.length === 0) {
    doc.fontSize(11).text("No data.");
    doc.end();
    return;
  }
  const headers = Object.keys(rows[0]);
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = pageWidth / headers.length;
  const lineHeight = 14;
  doc.fontSize(9).fillColor("white");
  let x = doc.page.margins.left;
  const y = doc.y;
  doc.rect(x, y - 2, pageWidth, lineHeight + 2).fill("#1f2937");
  doc.fillColor("white");
  for (const h of headers) {
    doc.text(h, x + 3, y + 1, { width: colWidth - 6, ellipsis: true });
    x += colWidth;
  }
  doc.fillColor("black");
  doc.moveDown(0.5);
  let rowY = y + lineHeight + 2;
  doc.fontSize(8);
  for (const r of rows) {
    if (rowY > doc.page.height - doc.page.margins.bottom - lineHeight) {
      doc.addPage();
      rowY = doc.page.margins.top;
    }
    let cx = doc.page.margins.left;
    for (const h of headers) {
      const v = r[h];
      const s = v == null ? "" : String(v);
      doc.text(s, cx + 3, rowY, { width: colWidth - 6, ellipsis: true });
      cx += colWidth;
    }
    rowY += lineHeight;
  }
  doc.end();
}
function respond(req, res, name, rows, label) {
  const format = String(req.query.format ?? "json");
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${name}.csv"`);
    res.send(toCsv(rows));
    return;
  }
  if (format === "xlsx") {
    void sendXlsx(res, name, rows);
    return;
  }
  if (format === "pdf") {
    sendPdf(res, name, label ?? name, rows);
    return;
  }
  res.json(rows);
}
reportsR4Router.get("/reports/sales-register", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const { from, to } = parseDateRange(req);
  const invSnap = await db33().collection("invoices").where("organizationId", "==", orgId).get();
  const rows = invSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => {
    const issue = r.issueDate;
    return issue >= from.toISOString() && issue <= to.toISOString();
  });
  rows.sort((a, b) => (a.issueDate ?? "").localeCompare(b.issueDate ?? ""));
  const clientSnap = await db33().collection("clients").where("organizationId", "==", orgId).get();
  const cmap = new Map(clientSnap.docs.map((d) => [d.id, d.data()]));
  const data = rows.map((r) => ({
    invoiceNumber: r.invoiceNumber,
    issueDate: r.issueDate?.slice(0, 10),
    clientName: r.clientId ? cmap.get(r.clientId)?.name ?? "" : "",
    status: r.status,
    subtotal: Number(r.subtotal),
    cgst: Number(r.cgst),
    sgst: Number(r.sgst),
    igst: Number(r.igst),
    total: Number(r.total),
    amountPaid: Number(r.amountPaid),
    balance: Number(r.total) - Number(r.amountPaid)
  }));
  respond(req, res, "sales-register", data, "Sales register");
});
reportsR4Router.get("/reports/purchase-register", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const { from, to } = parseDateRange(req);
  const poSnap = await db33().collection("purchase_orders").where("organizationId", "==", orgId).get();
  const rows = poSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => {
    const created = r.createdAt;
    return created >= from.toISOString() && created <= to.toISOString();
  });
  rows.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
  const vendorSnap = await db33().collection("vendors").where("organizationId", "==", orgId).get();
  const vmap = new Map(vendorSnap.docs.map((d) => [d.id, d.data()]));
  const data = rows.map((r) => ({
    poNumber: r.poNumber,
    date: r.createdAt?.slice(0, 10),
    vendorName: r.vendorId ? vmap.get(r.vendorId)?.name ?? "" : "",
    status: r.status,
    subtotal: Number(r.subtotal),
    taxAmount: Number(r.taxAmount),
    total: Number(r.total)
  }));
  respond(req, res, "purchase-register", data, "Purchase register");
});
reportsR4Router.get("/reports/customer-ageing", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const invSnap = await db33().collection("invoices").where("organizationId", "==", orgId).get();
  const rows = invSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const clientSnap = await db33().collection("clients").where("organizationId", "==", orgId).get();
  const cmap = new Map(clientSnap.docs.map((d) => [d.id, d.data()]));
  const now = Date.now();
  const buckets = /* @__PURE__ */ new Map();
  for (const inv of rows) {
    if (["paid", "cancelled", "draft"].includes(inv.status)) continue;
    const balance = Number(inv.total) - Number(inv.amountPaid);
    if (balance <= 0) continue;
    const cid = inv.clientId ?? "0";
    const cname = cmap.get(cid)?.name ?? "Unknown";
    const dueStr = inv.dueDate;
    const issueStr = inv.issueDate;
    const refTime = dueStr ? new Date(dueStr).getTime() : new Date(issueStr).getTime();
    const ageDays = Math.max(0, Math.floor((now - refTime) / 864e5));
    const b = buckets.get(cid) ?? { clientId: cid, clientName: cname, current: 0, days30: 0, days60: 0, days90: 0, daysOver90: 0, total: 0 };
    if (ageDays <= 0) b.current += balance;
    else if (ageDays <= 30) b.days30 += balance;
    else if (ageDays <= 60) b.days60 += balance;
    else if (ageDays <= 90) b.days90 += balance;
    else b.daysOver90 += balance;
    b.total += balance;
    buckets.set(cid, b);
  }
  respond(req, res, "customer-ageing", [...buckets.values()].sort((a, b) => b.total - a.total), "Customer ageing");
});
reportsR4Router.get("/reports/top-items", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const invSnap = await db33().collection("invoices").where("organizationId", "==", orgId).get();
  const orgInvoices = invSnap.docs.filter((d) => d.data().status !== "cancelled");
  const invIds = new Set(orgInvoices.map((d) => d.id));
  if (invIds.size === 0) {
    respond(req, res, "top-items", [], "Top items");
    return;
  }
  const allQiSnap = await db33().collection("invoice_items").get();
  const items = allQiSnap.docs.map((d) => d.data()).filter((r) => invIds.has(r.invoiceId));
  const descMap = /* @__PURE__ */ new Map();
  for (const i of items) {
    const desc = i.description;
    const entry = descMap.get(desc) ?? { qty: 0, revenue: 0 };
    entry.qty += Number(i.quantity ?? 0);
    entry.revenue += Number(i.totalPrice ?? 0);
    descMap.set(desc, entry);
  }
  const sorted = Array.from(descMap.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 20);
  respond(
    req,
    res,
    "top-items",
    sorted.map((i) => ({ name: i.name, quantity: i.qty, revenue: i.revenue })),
    "Top items"
  );
});
reportsR4Router.get("/reports/lead-source-roi", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const leadsSnap = await db33().collection("leads").where("organizationId", "==", orgId).get();
  const allLeads = leadsSnap.docs.map((d) => d.data());
  const sourceMap = /* @__PURE__ */ new Map();
  for (const l of allLeads) {
    const src = l.source;
    const entry = sourceMap.get(src) ?? { total: 0, won: 0, lost: 0 };
    entry.total += 1;
    if (l.status === "won") entry.won += 1;
    if (l.status === "lost") entry.lost += 1;
    sourceMap.set(src, entry);
  }
  const wonLeads = allLeads.filter((l) => l.status === "won");
  const clientIds = wonLeads.map((l) => l.convertedClientId).filter(Boolean);
  const invMap = /* @__PURE__ */ new Map();
  if (clientIds.length) {
    const invSnap = await db33().collection("invoices").where("organizationId", "==", orgId).get();
    for (const d of invSnap.docs) {
      const inv = d.data();
      if (clientIds.includes(inv.clientId)) {
        invMap.set(inv.clientId, (invMap.get(inv.clientId) ?? 0) + Number(inv.amountPaid));
      }
    }
  }
  const revBySource = /* @__PURE__ */ new Map();
  for (const l of wonLeads) {
    const rev = invMap.get(l.convertedClientId) ?? 0;
    revBySource.set(l.source, (revBySource.get(l.source) ?? 0) + rev);
  }
  respond(
    req,
    res,
    "lead-source-roi",
    Array.from(sourceMap.entries()).map(([source, v]) => ({
      source,
      total: v.total,
      won: v.won,
      lost: v.lost,
      conversionPct: v.total > 0 ? Math.round(v.won / v.total * 100) : 0,
      revenue: revBySource.get(source) ?? 0
    })),
    "Lead source ROI"
  );
});
reportsR4Router.get("/reports/social-engagement", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const postsSnap = await db33().collection("social_posts").where("organizationId", "==", orgId).get();
  const posts = postsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const resultsSnap = await db33().collection("social_post_results").where("organizationId", "==", orgId).get();
  const allResults = resultsSnap.docs.map((d) => d.data());
  const byPost = /* @__PURE__ */ new Map();
  for (const r of allResults) {
    const arr = byPost.get(r.postId) ?? [];
    arr.push(r);
    byPost.set(r.postId, arr);
  }
  const data = posts.filter((p) => p.status === "posted" || p.status === "partial").map((p) => {
    const r = byPost.get(p.id) ?? [];
    const likes = r.reduce((s, x) => s + Number(x.metrics?.likes ?? 0), 0);
    const comments = r.reduce((s, x) => s + Number(x.metrics?.comments ?? 0), 0);
    const shares = r.reduce((s, x) => s + Number(x.metrics?.shares ?? 0), 0);
    const impressions = r.reduce((s, x) => s + Number(x.metrics?.impressions ?? 0), 0);
    return {
      id: p.id,
      content: p.content.slice(0, 60),
      platforms: (p.platforms ?? []).join(", "),
      publishedAt: p.publishedAt ?? null,
      likes,
      comments,
      shares,
      impressions
    };
  });
  respond(req, res, "social-engagement", data, "Social engagement");
});
reportsR4Router.get("/reports/email-performance", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const campaignsSnap = await db33().collection("campaigns").where("organizationId", "==", orgId).get();
  const campaigns = campaignsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const recsSnap = await db33().collection("campaign_recipients").where("organizationId", "==", orgId).get();
  const recs = recsSnap.docs.map((d) => d.data());
  const data = campaigns.map((c) => {
    const r = recs.filter((x) => x.campaignId === c.id);
    const sent = r.filter((x) => ["sent", "opened", "clicked"].includes(x.status)).length;
    const opened = r.filter((x) => ["opened", "clicked"].includes(x.status)).length;
    const clicked = r.filter((x) => x.status === "clicked").length;
    return {
      campaignId: c.id,
      name: c.name,
      subject: c.subject,
      sentAt: c.sentAt ?? null,
      sent,
      opened,
      clicked,
      openRate: sent > 0 ? Math.round(opened / sent * 100) : 0,
      clickRate: sent > 0 ? Math.round(clicked / sent * 100) : 0
    };
  });
  const emailsSnap = await db33().collection("emails").where("organizationId", "==", orgId).where("direction", "==", "outbound").get();
  const tot = emailsSnap.size;
  const op = emailsSnap.docs.filter((d) => d.data().status === "opened").length;
  respond(req, res, "email-performance", [
    ...data,
    {
      campaignId: 0,
      name: "(transactional)",
      subject: "All non-campaign sent emails",
      sentAt: null,
      sent: tot,
      opened: op,
      clicked: 0,
      openRate: tot > 0 ? Math.round(op / tot * 100) : 0,
      clickRate: 0
    }
  ], "Email performance");
});
reportsR4Router.get("/reports/catalog", requireAuth, async (_req, res) => {
  res.json([
    { key: "sales-register", label: "Sales register", description: "Invoice-by-invoice register with GST split.", path: "/reports/sales-register" },
    { key: "purchase-register", label: "Purchase register", description: "Purchase orders with tax and totals.", path: "/reports/purchase-register" },
    { key: "customer-ageing", label: "Customer ageing", description: "Outstanding balances bucketed by age.", path: "/reports/customer-ageing" },
    { key: "top-items", label: "Top items sold", description: "Top 20 items by invoiced revenue.", path: "/reports/top-items" },
    { key: "lead-source-roi", label: "Lead source ROI", description: "Conversion and revenue by lead source.", path: "/reports/lead-source-roi" },
    { key: "social-engagement", label: "Social engagement", description: "Per-post likes, comments, shares.", path: "/reports/social-engagement" },
    { key: "email-performance", label: "Email performance", description: "Open and click rates per campaign.", path: "/reports/email-performance" }
  ]);
});
var reports_r4_default = reportsR4Router;

// src/routes/uploads.ts
var import_express31 = require("express");
var import_multer = __toESM(require("multer"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_crypto3 = require("node:crypto");
var uploadsRouter = (0, import_express31.Router)();
var UPLOAD_DIR = process.env.VERCEL ? "/tmp/uploads" : import_node_path.default.resolve("uploads");
try {
  if (!import_node_fs.default.existsSync(UPLOAD_DIR)) import_node_fs.default.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {
}
var storage = import_multer.default.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = import_node_path.default.extname(file.originalname).toLowerCase().slice(0, 8) || ".bin";
    cb(null, `${Date.now()}-${(0, import_node_crypto3.randomBytes)(6).toString("hex")}${ext}`);
  }
});
var upload = (0, import_multer.default)({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpe?g|png|webp|gif)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only images (jpg/png/webp/gif) up to 10 MB are allowed."));
  }
});
uploadsRouter.post("/uploads", requireAuth, upload.single("file"), (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No file uploaded (field name must be 'file')." });
    return;
  }
  const base = process.env.PUBLIC_APP_URL || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "");
  const url = `${base}/api/uploads/${file.filename}`;
  res.status(201).json({ url, filename: file.filename, size: file.size, mimeType: file.mimetype });
});
var uploads_default = uploadsRouter;

// src/routes/employees.ts
var import_express32 = require("express");
var db34 = () => getDb();
var employeesRouter = (0, import_express32.Router)();
function fmt15(e) {
  const leaveBalances = e.leaveBalances ?? {};
  return {
    id: e.id,
    employeeCode: e.employeeCode,
    name: e.name,
    email: e.email ?? null,
    phone: e.phone ?? null,
    role: e.role ?? null,
    department: e.department ?? null,
    dateOfJoining: e.dateOfJoining ?? null,
    status: e.status,
    basic: Number(e.basic ?? 0),
    hra: Number(e.hra ?? 0),
    allowances: Number(e.allowances ?? 0),
    otherDeductions: Number(e.otherDeductions ?? 0),
    pfEnabled: e.pfEnabled,
    esiEnabled: e.esiEnabled,
    bankName: e.bankName ?? null,
    bankAccount: e.bankAccount ?? null,
    ifsc: e.ifsc ?? null,
    panNumber: e.panNumber ?? null,
    leaveBalances,
    createdAt: e.createdAt ?? (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: e.updatedAt ?? (/* @__PURE__ */ new Date()).toISOString()
  };
}
employeesRouter.get("/employees", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    let rows;
    try {
      const snap = await db34().collection("employees").where("organizationId", "==", orgId).orderBy("createdAt", "desc").get();
      rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      if (err?.code === 9 || err?.code === "FAILED_PRECONDITION") {
        const snap = await db34().collection("employees").where("organizationId", "==", orgId).get();
        rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
      } else {
        throw err;
      }
    }
    res.json(rows.map(fmt15));
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Failed to list employees" });
  }
});
employeesRouter.post("/employees", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user.organizationId;
  const b = req.body ?? {};
  if (!b.name || !b.employeeCode) {
    res.status(400).json({ error: "name and employeeCode required" });
    return;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const docRef = await db34().collection("employees").add({
    organizationId: orgId,
    employeeCode: String(b.employeeCode),
    name: String(b.name),
    email: b.email ?? null,
    phone: b.phone ?? null,
    role: b.role ?? null,
    department: b.department ?? null,
    dateOfJoining: b.dateOfJoining ?? null,
    status: b.status ?? "active",
    basic: String(b.basic ?? 0),
    hra: String(b.hra ?? 0),
    allowances: String(b.allowances ?? 0),
    otherDeductions: String(b.otherDeductions ?? 0),
    pfEnabled: Boolean(b.pfEnabled),
    esiEnabled: Boolean(b.esiEnabled),
    bankName: b.bankName ?? null,
    bankAccount: b.bankAccount ?? null,
    ifsc: b.ifsc ?? null,
    panNumber: b.panNumber ?? null,
    leaveBalances: b.leaveBalances ?? { casual: 12, sick: 7, earned: 15 },
    createdAt: now,
    updatedAt: now
  });
  const doc = await docRef.get();
  await logAction(req, "CREATE", "employee", docRef.id);
  res.status(201).json(fmt15({ id: doc.id, ...doc.data() }));
});
employeesRouter.get("/employees/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const doc = await db34().collection("employees").doc(id).get();
  if (!doc.exists || doc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.json(fmt15({ id: doc.id, ...doc.data() }));
});
employeesRouter.patch("/employees/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const b = req.body ?? {};
  const doc = await db34().collection("employees").doc(id).get();
  if (!doc.exists || doc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  const updates = { updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  for (const f of [
    "employeeCode",
    "name",
    "email",
    "phone",
    "role",
    "department",
    "dateOfJoining",
    "status",
    "bankName",
    "bankAccount",
    "ifsc",
    "panNumber",
    "leaveBalances"
  ]) {
    if (b[f] !== void 0) updates[f] = b[f];
  }
  for (const f of ["basic", "hra", "allowances", "otherDeductions"]) {
    if (b[f] !== void 0) updates[f] = String(b[f]);
  }
  for (const f of ["pfEnabled", "esiEnabled"]) {
    if (b[f] !== void 0) updates[f] = Boolean(b[f]);
  }
  await db34().collection("employees").doc(id).update(updates);
  const updated = await db34().collection("employees").doc(id).get();
  await logAction(req, "UPDATE", "employee", id);
  res.json(fmt15({ id: updated.id, ...updated.data() }));
});
employeesRouter.delete("/employees/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const doc = await db34().collection("employees").doc(id).get();
  if (!doc.exists || doc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  await db34().collection("employees").doc(id).delete();
  await logAction(req, "DELETE", "employee", id);
  res.json({ message: "Employee deleted" });
});
var employees_default = employeesRouter;

// src/routes/attendance.ts
var import_express33 = require("express");
var db35 = () => getDb();
var attendanceRouter = (0, import_express33.Router)();
function fmt16(a) {
  return {
    id: a.id,
    employeeId: a.employeeId,
    date: a.date,
    status: a.status,
    leaveType: a.leaveType ?? null,
    notes: a.notes ?? null,
    createdAt: a.createdAt ?? (/* @__PURE__ */ new Date()).toISOString()
  };
}
attendanceRouter.get("/attendance", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;
  const employeeId = req.query.employeeId ? String(req.query.employeeId) : null;
  let query = db35().collection("attendance").where("organizationId", "==", orgId);
  if (employeeId) query = query.where("employeeId", "==", employeeId);
  if (from) query = query.where("date", ">=", from);
  if (to) query = query.where("date", "<=", to);
  const snap = await query.get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(rows.map(fmt16));
});
attendanceRouter.post("/attendance", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const b = req.body ?? {};
  if (!b.employeeId || !b.date || !b.status) {
    res.status(400).json({ error: "employeeId, date and status required" });
    return;
  }
  const empSnap = await db35().collection("employees").doc(String(b.employeeId)).get();
  if (!empSnap.exists || empSnap.data()?.organizationId !== orgId) {
    res.status(400).json({ error: "Invalid employee" });
    return;
  }
  const existing = await db35().collection("attendance").where("organizationId", "==", orgId).where("employeeId", "==", String(b.employeeId)).where("date", "==", String(b.date)).get();
  for (const doc2 of existing.docs) {
    await doc2.ref.delete();
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const docRef = await db35().collection("attendance").add({
    organizationId: orgId,
    employeeId: String(b.employeeId),
    date: String(b.date),
    status: b.status,
    leaveType: b.leaveType ?? null,
    notes: b.notes ?? null,
    createdAt: now
  });
  const doc = await docRef.get();
  res.status(201).json(fmt16({ id: doc.id, ...doc.data() }));
});
attendanceRouter.post("/attendance/bulk", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const b = req.body ?? {};
  const date = b.date;
  const entries = Array.isArray(b.entries) ? b.entries : [];
  if (!date || entries.length === 0) {
    res.status(400).json({ error: "date and entries required" });
    return;
  }
  const existing = await db35().collection("attendance").where("organizationId", "==", orgId).where("date", "==", String(date)).get();
  for (const doc of existing.docs) {
    await doc.ref.delete();
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const results = [];
  for (const e of entries) {
    const docRef = await db35().collection("attendance").add({
      organizationId: orgId,
      employeeId: String(e.employeeId),
      date: String(date),
      status: e.status,
      leaveType: e.leaveType ?? null,
      notes: e.notes ?? null,
      createdAt: now
    });
    const doc = await docRef.get();
    results.push({ id: doc.id, ...doc.data() });
  }
  res.status(201).json(results.map(fmt16));
});
attendanceRouter.delete("/attendance/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const doc = await db35().collection("attendance").doc(id).get();
  if (!doc.exists || doc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db35().collection("attendance").doc(id).delete();
  res.json({ message: "Deleted" });
});
attendanceRouter.get("/leaves", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const snap = await db35().collection("attendance").where("organizationId", "==", orgId).where("status", "==", "leave").get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(rows.map(fmt16));
});
attendanceRouter.get("/leaves/balances", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const empsSnap = await db35().collection("employees").where("organizationId", "==", orgId).get();
  const allLeavesSnap = await db35().collection("attendance").where("organizationId", "==", orgId).where("status", "==", "leave").get();
  const used = /* @__PURE__ */ new Map();
  for (const lDoc of allLeavesSnap.docs) {
    const l = lDoc.data();
    const empId = l.employeeId;
    const m = used.get(empId) ?? {};
    const k = l.leaveType ?? "casual";
    m[k] = (m[k] ?? 0) + 1;
    used.set(empId, m);
  }
  res.json(
    empsSnap.docs.map((d) => {
      const e = d.data();
      return {
        employeeId: d.id,
        employeeName: e.name,
        balances: e.leaveBalances ?? {},
        used: used.get(d.id) ?? {}
      };
    })
  );
});
var attendance_default = attendanceRouter;

// src/routes/payroll.ts
var import_express34 = require("express");
init_logger();
var import_pdfkit2 = __toESM(require("pdfkit"), 1);
var db36 = () => getDb();
var payrollRouter = (0, import_express34.Router)();
function fmtRun(r) {
  return {
    id: r.id,
    periodMonth: r.periodMonth,
    periodYear: r.periodYear,
    status: r.status,
    totalGross: Number(r.totalGross ?? 0),
    totalDeductions: Number(r.totalDeductions ?? 0),
    totalNet: Number(r.totalNet ?? 0),
    notes: r.notes ?? null,
    paidAt: r.paidAt ?? null,
    createdAt: r.createdAt ?? (/* @__PURE__ */ new Date()).toISOString()
  };
}
function fmtSlip(s) {
  return {
    id: s.id,
    payrollRunId: s.payrollRunId,
    employeeId: s.employeeId,
    basic: Number(s.basic ?? 0),
    hra: Number(s.hra ?? 0),
    allowances: Number(s.allowances ?? 0),
    daysWorked: Number(s.daysWorked ?? 0),
    daysInMonth: s.daysInMonth,
    lopAmount: Number(s.lopAmount ?? 0),
    pfAmount: Number(s.pfAmount ?? 0),
    esiAmount: Number(s.esiAmount ?? 0),
    otherDeductions: Number(s.otherDeductions ?? 0),
    gross: Number(s.gross ?? 0),
    deductions: Number(s.deductions ?? 0),
    net: Number(s.net ?? 0),
    status: s.status,
    paidAt: s.paidAt ?? null
  };
}
function daysInMonth(year, month1) {
  return new Date(year, month1, 0).getDate();
}
payrollRouter.get("/payroll-runs", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const snap = await db36().collection("payroll_runs").where("organizationId", "==", orgId).orderBy("periodYear", "desc").orderBy("periodMonth", "desc").get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(rows.map(fmtRun));
});
async function computePayrollRun(orgId, periodMonth, periodYear, notes = null) {
  const dim = daysInMonth(periodYear, periodMonth);
  const monthStart = `${periodYear}-${String(periodMonth).padStart(2, "0")}-01`;
  const monthEnd = `${periodYear}-${String(periodMonth).padStart(2, "0")}-${String(dim).padStart(2, "0")}`;
  const empsSnap = await db36().collection("employees").where("organizationId", "==", orgId).where("status", "==", "active").get();
  const attSnap = await db36().collection("attendance").where("organizationId", "==", orgId).where("date", ">=", monthStart).where("date", "<=", monthEnd).get();
  const byEmp = /* @__PURE__ */ new Map();
  for (const a of attSnap.docs) {
    const empId = a.data().employeeId;
    const arr = byEmp.get(empId) ?? [];
    arr.push(a);
    byEmp.set(empId, arr);
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const runRef = await db36().collection("payroll_runs").add({
    organizationId: orgId,
    periodMonth,
    periodYear,
    status: "computed",
    notes,
    totalGross: "0",
    totalDeductions: "0",
    totalNet: "0",
    createdAt: now
  });
  let totalGross = 0;
  let totalDed = 0;
  let totalNet = 0;
  for (const empDoc of empsSnap.docs) {
    const emp = empDoc.data();
    const empId = empDoc.id;
    const recs = byEmp.get(empId) ?? [];
    let worked = 0;
    if (recs.length === 0) {
      worked = dim;
    } else {
      for (const r of recs) {
        const st = r.data().status;
        if (st === "present" || st === "leave" || st === "holiday" || st === "weekoff") worked += 1;
        else if (st === "half") worked += 0.5;
      }
    }
    const basic = Number(emp.basic ?? 0);
    const hra = Number(emp.hra ?? 0);
    const allowances = Number(emp.allowances ?? 0);
    const fullGross = basic + hra + allowances;
    const perDay = fullGross / dim;
    const lopDays = Math.max(0, dim - worked);
    const lop = Number((perDay * lopDays).toFixed(2));
    const grossThisMonth = Number((fullGross - lop).toFixed(2));
    const pf = emp.pfEnabled ? Number((basic * 0.12).toFixed(2)) : 0;
    const esi = emp.esiEnabled && grossThisMonth <= 21e3 ? Number((grossThisMonth * 75e-4).toFixed(2)) : 0;
    const other = Number(emp.otherDeductions ?? 0);
    const deductions = Number((pf + esi + other).toFixed(2));
    const net = Number((grossThisMonth - deductions).toFixed(2));
    await db36().collection("payslips").add({
      organizationId: orgId,
      payrollRunId: runRef.id,
      employeeId: empId,
      basic: basic.toFixed(2),
      hra: hra.toFixed(2),
      allowances: allowances.toFixed(2),
      daysWorked: worked.toFixed(2),
      daysInMonth: dim,
      lopAmount: lop.toFixed(2),
      pfAmount: pf.toFixed(2),
      esiAmount: esi.toFixed(2),
      otherDeductions: other.toFixed(2),
      gross: grossThisMonth.toFixed(2),
      deductions: deductions.toFixed(2),
      net: net.toFixed(2),
      status: "computed",
      createdAt: now
    });
    totalGross += grossThisMonth;
    totalDed += deductions;
    totalNet += net;
  }
  await db36().collection("payroll_runs").doc(runRef.id).update({
    totalGross: totalGross.toFixed(2),
    totalDeductions: totalDed.toFixed(2),
    totalNet: totalNet.toFixed(2)
  });
  const updated = await db36().collection("payroll_runs").doc(runRef.id).get();
  return { id: updated.id, ...updated.data() };
}
payrollRouter.post("/payroll-runs", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user.organizationId;
  const b = req.body ?? {};
  const periodMonth = Number(b.periodMonth);
  const periodYear = Number(b.periodYear);
  if (!periodMonth || !periodYear || periodMonth < 1 || periodMonth > 12) {
    res.status(400).json({ error: "periodMonth (1-12) and periodYear required" });
    return;
  }
  const existingSnap = await db36().collection("payroll_runs").where("organizationId", "==", orgId).where("periodMonth", "==", periodMonth).where("periodYear", "==", periodYear).get();
  if (!existingSnap.empty) {
    res.status(409).json({ error: `Payroll run already exists for ${periodMonth}/${periodYear}` });
    return;
  }
  const u = await computePayrollRun(orgId, periodMonth, periodYear, b.notes ?? null);
  await logAction(req, "CREATE", "payroll_run", u.id, `${periodMonth}/${periodYear}`);
  res.status(201).json(fmtRun(u));
});
payrollRouter.get("/payroll-runs/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const runDoc = await db36().collection("payroll_runs").doc(id).get();
  if (!runDoc.exists || runDoc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Payroll run not found" });
    return;
  }
  const slipsSnap = await db36().collection("payslips").where("payrollRunId", "==", id).get();
  const empsSnap = await db36().collection("employees").where("organizationId", "==", orgId).get();
  const emap = new Map(empsSnap.docs.map((d) => [d.id, d.data()]));
  res.json({
    ...fmtRun({ id: runDoc.id, ...runDoc.data() }),
    payslips: slipsSnap.docs.map((sDoc) => {
      const s = sDoc.data();
      return {
        ...fmtSlip({ id: sDoc.id, ...s }),
        employeeName: emap.get(s.employeeId)?.name ?? "",
        employeeCode: emap.get(s.employeeId)?.employeeCode ?? ""
      };
    })
  });
});
payrollRouter.post("/payroll-runs/:id/mark-paid", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const runDoc = await db36().collection("payroll_runs").doc(id).get();
  if (!runDoc.exists || runDoc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Payroll run not found" });
    return;
  }
  const runData = runDoc.data();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db36().collection("payroll_runs").doc(id).update({ status: "paid", paidAt: now });
  const slipsSnap = await db36().collection("payslips").where("payrollRunId", "==", id).get();
  for (const slipDoc of slipsSnap.docs) {
    await slipDoc.ref.update({ status: "paid", paidAt: now });
  }
  const gross = Number(runData.totalGross ?? 0);
  const deductions = Number(runData.totalDeductions ?? 0);
  const net = Number(runData.totalNet ?? 0);
  await reverseAndRepost(
    orgId,
    "payroll_run",
    id,
    async () => {
      const lines = [
        { accountCode: "5100", debit: gross, description: "Salaries (gross)" },
        { accountCode: "1010", credit: net, description: "Salaries paid (net)" }
      ];
      if (deductions > 0) {
        lines.push({ accountCode: "2200", credit: deductions, description: "PF/ESI/Other deductions" });
      }
      return lines;
    },
    { entryDate: /* @__PURE__ */ new Date(), memo: `Payroll ${runData.periodMonth}/${runData.periodYear}` }
  );
  await logAction(req, "MARK_PAID", "payroll_run", id);
  let emailedCount = 0;
  try {
    const orgDoc = await db36().collection("organizations").doc(orgId).get();
    const orgData = orgDoc.data();
    if (orgData?.payrollSettings?.emailPayslips) {
      emailedCount = await emailPayslipsForRun(orgId, id, req.user.email, req.user.userId);
    }
  } catch (err) {
    logger.error({ err, runId: id }, "Failed to email payslips after mark-paid");
  }
  res.json({ message: "Payroll marked paid", emailedPayslips: emailedCount });
});
async function emailPayslipsForRun(orgId, runId, fromEmail, userId) {
  const runDoc = await db36().collection("payroll_runs").doc(runId).get();
  if (!runDoc.exists) return 0;
  const runData = runDoc.data();
  const slipsSnap = await db36().collection("payslips").where("payrollRunId", "==", runId).get();
  const empsSnap = await db36().collection("employees").where("organizationId", "==", orgId).get();
  const empById = new Map(empsSnap.docs.map((d) => [d.id, d.data()]));
  const month = MONTHS[runData.periodMonth];
  const base = process.env.PUBLIC_APP_URL || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "");
  let n = 0;
  for (const sDoc of slipsSnap.docs) {
    const s = sDoc.data();
    const emp = empById.get(s.employeeId);
    if (!emp?.email) continue;
    const subject = `Your payslip for ${month} ${runData.periodYear}`;
    const netPay = Number(s.net).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const pdfUrl = base ? `${base}/api/payslips/${sDoc.id}/pdf` : `/api/payslips/${sDoc.id}/pdf`;
    const body = `Hi ${emp.name},

Your salary for ${month} ${runData.periodYear} has been processed.

Net pay: \u20B9 ${netPay}

Download your payslip: ${pdfUrl}

Regards,
Payroll`;
    const messageId = `<payslip.${sDoc.id}.${Date.now()}@msme-pro>`;
    await db36().collection("emails").add({
      organizationId: orgId,
      userId: userId ?? null,
      direction: "outbound",
      fromEmail,
      toEmail: emp.email,
      subject,
      body,
      status: "sent",
      messageId,
      threadId: messageId,
      sentAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    n += 1;
  }
  return n;
}
var MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function renderPayslip(doc, slip, emp, run) {
  const month = MONTHS[run.periodMonth];
  doc.fontSize(18).fillColor("black").text("Salary Slip", { align: "center" });
  doc.moveDown(0.4);
  doc.fontSize(11).fillColor("#555").text(`Pay period: ${month} ${run.periodYear}`, { align: "center" });
  doc.moveDown().fillColor("black");
  doc.fontSize(11);
  const left = 48;
  let y = doc.y;
  doc.text(`Employee: ${emp?.name ?? ""}`, left, y);
  doc.text(`Code: ${emp?.employeeCode ?? ""}`, left + 280, y);
  y += 16;
  doc.text(`PAN: ${emp?.panNumber ?? "\u2014"}`, left, y);
  doc.text(`Bank: ${emp?.bankName ?? "\u2014"} ${emp?.bankAccount ? `(${String(emp.bankAccount).slice(-4)})` : ""}`, left + 280, y);
  y += 16;
  doc.text(`Days worked: ${Number(slip.daysWorked)} / ${slip.daysInMonth}`, left, y);
  doc.moveDown(2);
  doc.fontSize(12).fillColor("#1f2937").text("Earnings", left);
  doc.fontSize(10).fillColor("black");
  const fmt19 = (n) => `\u20B9 ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const erow = (label, amount) => {
    const cy = doc.y;
    doc.text(label, left, cy);
    doc.text(fmt19(amount), left + 360, cy, { width: 120, align: "right" });
    doc.moveDown(0.4);
  };
  erow("Basic", Number(slip.basic));
  erow("HRA", Number(slip.hra));
  erow("Allowances", Number(slip.allowances));
  erow("Less: Loss of pay", -Number(slip.lopAmount));
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor("#1f2937");
  erow("Gross", Number(slip.gross));
  doc.moveDown(0.8);
  doc.fontSize(12).fillColor("#1f2937").text("Deductions", left);
  doc.fontSize(10).fillColor("black");
  erow("Provident Fund", Number(slip.pfAmount));
  erow("ESI", Number(slip.esiAmount));
  erow("Other deductions", Number(slip.otherDeductions));
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor("#1f2937");
  erow("Total deductions", Number(slip.deductions));
  doc.moveDown(0.8);
  doc.fontSize(14).fillColor("black");
  const fy = doc.y;
  doc.rect(left, fy - 4, 500, 28).fill("#e0f2fe");
  doc.fillColor("#0c4a6e");
  doc.text("Net pay", left + 12, fy + 4);
  doc.text(fmt19(Number(slip.net)), left + 360, fy + 4, { width: 130, align: "right" });
  doc.fillColor("black");
  doc.moveDown(3);
  doc.fontSize(9).fillColor("#666").text(
    "This is a system-generated payslip. No signature required.",
    { align: "center" }
  );
}
payrollRouter.get("/payslips/:id/pdf", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const slipDoc = await db36().collection("payslips").doc(id).get();
  if (!slipDoc.exists || slipDoc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Payslip not found" });
    return;
  }
  const slipData = slipDoc.data();
  const empDoc = await db36().collection("employees").doc(slipData.employeeId).get();
  const runDoc = await db36().collection("payroll_runs").doc(slipData.payrollRunId).get();
  const runData = runDoc.data();
  const month = MONTHS[runData.periodMonth];
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="payslip-${empDoc.data()?.employeeCode ?? id}-${month}-${runData.periodYear}.pdf"`);
  const doc = new import_pdfkit2.default({ size: "A4", margin: 48 });
  doc.pipe(res);
  renderPayslip(doc, slipData, empDoc.data(), runData);
  doc.end();
});
payrollRouter.get("/payroll-runs/:id/payslips.pdf", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const runDoc = await db36().collection("payroll_runs").doc(id).get();
  if (!runDoc.exists || runDoc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  const runData = runDoc.data();
  const slipsSnap = await db36().collection("payslips").where("payrollRunId", "==", id).get();
  if (slipsSnap.empty) {
    res.status(400).json({ error: "Run has no payslips" });
    return;
  }
  const empsSnap = await db36().collection("employees").where("organizationId", "==", orgId).get();
  const empById = new Map(empsSnap.docs.map((d) => [d.id, d.data()]));
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="payslips-${MONTHS[runData.periodMonth]}-${runData.periodYear}.pdf"`);
  const doc = new import_pdfkit2.default({ size: "A4", margin: 48, autoFirstPage: false });
  doc.pipe(res);
  for (const sDoc of slipsSnap.docs) {
    doc.addPage();
    renderPayslip(doc, sDoc.data(), empById.get(sDoc.data().employeeId), runData);
  }
  doc.end();
});
payrollRouter.get("/payroll-runs/:id/payments.csv", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const runDoc = await db36().collection("payroll_runs").doc(id).get();
  if (!runDoc.exists || runDoc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  const runData = runDoc.data();
  const slipsSnap = await db36().collection("payslips").where("payrollRunId", "==", id).get();
  const empsSnap = await db36().collection("employees").where("organizationId", "==", orgId).get();
  const empById = new Map(empsSnap.docs.map((d) => [d.id, d.data()]));
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["Employee Code", "Employee Name", "Bank Name", "Account Number", "IFSC", "PAN", "Net Pay (INR)"];
  const lines = [header.join(",")];
  for (const sDoc of slipsSnap.docs) {
    const s = sDoc.data();
    const e = empById.get(s.employeeId);
    lines.push([
      esc(e?.employeeCode),
      esc(e?.name),
      esc(e?.bankName),
      esc(e?.bankAccount),
      esc(e?.ifsc),
      esc(e?.panNumber),
      Number(s.net).toFixed(2)
    ].join(","));
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="payroll-payments-${MONTHS[runData.periodMonth]}-${runData.periodYear}.csv"`);
  res.send(lines.join("\n"));
});
var payroll_default = payrollRouter;

// src/routes/leave-requests.ts
var import_express35 = require("express");
var db37 = () => getDb();
var leaveRequestsRouter = (0, import_express35.Router)();
function isApprover(role) {
  return role === "owner" || role === "admin";
}
async function findSelfEmployees(orgId, userId) {
  const userDoc = await db37().collection("users").doc(userId).get();
  const userData = userDoc.data();
  if (!userData?.email) return [];
  const empsSnap = await db37().collection("employees").where("organizationId", "==", orgId).get();
  const target = userData.email.trim().toLowerCase();
  return empsSnap.docs.filter((d) => (d.data().email ?? "").trim().toLowerCase() === target).map((d) => d.id);
}
leaveRequestsRouter.get("/leave-requests", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const role = req.user.role;
  if (isApprover(role)) {
    const snap2 = await db37().collection("leave_requests").where("organizationId", "==", orgId).orderBy("createdAt", "desc").get();
    const rows2 = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(rows2);
    return;
  }
  const selfIds = await findSelfEmployees(orgId, req.user.userId);
  if (selfIds.length === 0) {
    res.json([]);
    return;
  }
  const snap = await db37().collection("leave_requests").where("organizationId", "==", orgId).where("employeeId", "in", selfIds).orderBy("createdAt", "desc").get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(rows);
});
leaveRequestsRouter.post("/leave-requests", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const role = req.user.role;
  const b = req.body ?? {};
  if (!b.fromDate || !b.toDate) {
    res.status(400).json({ error: "fromDate and toDate required" });
    return;
  }
  let targetEmployeeId = b.employeeId != null ? String(b.employeeId) : null;
  if (!isApprover(role)) {
    const selfIds = await findSelfEmployees(orgId, req.user.userId);
    if (selfIds.length === 0) {
      res.status(403).json({ error: "No employee profile linked to your account. Ask an admin to add you under Employees." });
      return;
    }
    if (targetEmployeeId != null && !selfIds.includes(targetEmployeeId)) {
      res.status(403).json({ error: "You can only request leave for yourself." });
      return;
    }
    targetEmployeeId = targetEmployeeId ?? selfIds[0];
  } else {
    if (!targetEmployeeId) {
      res.status(400).json({ error: "employeeId required" });
      return;
    }
  }
  const empDoc = await db37().collection("employees").doc(targetEmployeeId).get();
  if (!empDoc.exists || empDoc.data()?.organizationId !== orgId) {
    res.status(400).json({ error: "Invalid employee" });
    return;
  }
  const from = new Date(b.fromDate);
  const to = new Date(b.toDate);
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 864e5) + 1);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const docRef = await db37().collection("leave_requests").add({
    organizationId: orgId,
    employeeId: targetEmployeeId,
    leaveType: String(b.leaveType ?? "casual"),
    fromDate: b.fromDate,
    toDate: b.toDate,
    days: String(b.days ?? days),
    reason: b.reason ?? null,
    status: "pending",
    createdAt: now
  });
  const doc = await docRef.get();
  res.status(201).json({ id: doc.id, ...doc.data() });
});
async function decideLeave(req, res, decision) {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const note = req.body?.note ?? null;
  const lrDoc = await db37().collection("leave_requests").doc(id).get();
  if (!lrDoc.exists || lrDoc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Leave request not found" });
    return;
  }
  const lr = lrDoc.data();
  if (lr.status !== "pending") {
    res.status(409).json({ error: `Already ${lr.status}` });
    return;
  }
  await db37().runTransaction(async (tx) => {
    tx.update(db37().collection("leave_requests").doc(id), {
      status: decision,
      approverId: req.user.userId,
      decidedAt: (/* @__PURE__ */ new Date()).toISOString(),
      decisionNote: note
    });
    if (decision === "approved") {
      const start = new Date(lr.fromDate);
      const end = new Date(lr.toDate);
      const daysList = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        daysList.push(d.toISOString().slice(0, 10));
      }
      for (const day of daysList) {
        const existingSnap = await db37().collection("attendance").where("employeeId", "==", lr.employeeId).where("date", "==", day).get();
        if (!existingSnap.empty) {
          tx.update(existingSnap.docs[0].ref, { status: "leave", leaveType: lr.leaveType });
        } else {
          const attRef = db37().collection("attendance").doc();
          tx.set(attRef, {
            organizationId: orgId,
            employeeId: lr.employeeId,
            date: day,
            status: "leave",
            leaveType: lr.leaveType,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      }
      const empDoc = await db37().collection("employees").doc(lr.employeeId).get();
      if (empDoc.exists) {
        const empData = empDoc.data();
        const balances = { ...empData.leaveBalances ?? {} };
        const used = Number(lr.days);
        balances[lr.leaveType] = Math.max(0, (balances[lr.leaveType] ?? 0) - used);
        tx.update(db37().collection("employees").doc(lr.employeeId), {
          leaveBalances: balances,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
  });
  const updated = await db37().collection("leave_requests").doc(id).get();
  res.json({ id: updated.id, ...updated.data() });
}
leaveRequestsRouter.post("/leave-requests/:id/approve", requireAuth, requireRole("owner", "admin"), (req, res) => decideLeave(req, res, "approved"));
leaveRequestsRouter.post("/leave-requests/:id/reject", requireAuth, requireRole("owner", "admin"), (req, res) => decideLeave(req, res, "rejected"));
var leave_requests_default = leaveRequestsRouter;

// src/routes/expenses.ts
var import_express36 = require("express");
var db38 = () => getDb();
var expensesRouter = (0, import_express36.Router)();
var DEFAULT_CATEGORIES = [
  { name: "Rent", accountCode: "5200" },
  { name: "Utilities", accountCode: "5300" },
  { name: "Travel", accountCode: "5400" },
  { name: "Office Supplies", accountCode: "5500" },
  { name: "Marketing", accountCode: "5600" },
  { name: "Other", accountCode: "5900" }
];
async function ensureCategories(orgId) {
  const existing = await db38().collection("expense_categories").where("organizationId", "==", orgId).get();
  if (!existing.empty) return;
  for (const c of DEFAULT_CATEGORIES) {
    await db38().collection("expense_categories").add({
      organizationId: orgId,
      name: c.name,
      accountCode: c.accountCode,
      isSystem: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
}
function fmt17(e) {
  return {
    id: e.id,
    expenseDate: e.expenseDate,
    categoryId: e.categoryId ?? null,
    vendorName: e.vendorName ?? null,
    description: e.description ?? null,
    amount: Number(e.amount ?? 0),
    gstRate: Number(e.gstRate ?? 0),
    gstAmount: Number(e.gstAmount ?? 0),
    total: Number(e.total ?? 0),
    paymentMethod: e.paymentMethod,
    receiptUrl: e.receiptUrl ?? null,
    notes: e.notes ?? null,
    createdAt: e.createdAt ?? (/* @__PURE__ */ new Date()).toISOString()
  };
}
function fmtCat(c) {
  return {
    id: c.id,
    name: c.name,
    accountCode: c.accountCode ?? null,
    isSystem: c.isSystem,
    createdAt: c.createdAt ?? (/* @__PURE__ */ new Date()).toISOString()
  };
}
expensesRouter.get("/expense-categories", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  await ensureCategories(orgId);
  await ensureChartOfAccounts(orgId);
  const snap = await db38().collection("expense_categories").where("organizationId", "==", orgId).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(rows.map(fmtCat));
});
expensesRouter.post("/expense-categories", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const b = req.body ?? {};
  if (!b.name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const docRef = await db38().collection("expense_categories").add({
    organizationId: orgId,
    name: String(b.name),
    accountCode: b.accountCode ?? "5900",
    isSystem: false,
    createdAt: now
  });
  const doc = await docRef.get();
  res.status(201).json(fmtCat({ id: doc.id, ...doc.data() }));
});
async function postExpenseJournal(orgId, expenseId) {
  const expDoc = await db38().collection("expenses").doc(expenseId).get();
  if (!expDoc.exists || expDoc.data()?.organizationId !== orgId) return;
  const e = expDoc.data();
  let expenseAccount = "5900";
  if (e.categoryId) {
    const catDoc = await db38().collection("expense_categories").doc(e.categoryId).get();
    if (catDoc.exists && catDoc.data()?.accountCode) expenseAccount = catDoc.data().accountCode;
  }
  const payAccount = e.paymentMethod === "cash" ? "1000" : "1010";
  await reverseAndRepost(
    orgId,
    "expense",
    expenseId,
    async () => {
      const lines = [
        { accountCode: expenseAccount, debit: Number(e.amount ?? 0), description: e.description ?? void 0 }
      ];
      if (Number(e.gstAmount ?? 0) > 0) {
        lines.push({ accountCode: "1300", debit: Number(e.gstAmount ?? 0), description: "GST input on expense" });
      }
      lines.push({ accountCode: payAccount, credit: Number(e.total ?? 0), description: `Paid via ${e.paymentMethod}` });
      return lines;
    },
    { entryDate: new Date(e.expenseDate), memo: `Expense: ${e.description ?? e.vendorName ?? ""}` }
  );
}
expensesRouter.get("/expenses", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;
  let query = db38().collection("expenses").where("organizationId", "==", orgId);
  if (from) query = query.where("expenseDate", ">=", from);
  if (to) query = query.where("expenseDate", "<=", to);
  const snap = await query.orderBy("expenseDate", "desc").get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(rows.map(fmt17));
});
expensesRouter.post("/expenses", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const b = req.body ?? {};
  if (b.amount === void 0 || !b.expenseDate) {
    res.status(400).json({ error: "amount and expenseDate required" });
    return;
  }
  const amount = Number(b.amount);
  const gstRate = Number(b.gstRate ?? 0);
  const gstAmount = Number((amount * gstRate / 100).toFixed(2));
  const total = Number((amount + gstAmount).toFixed(2));
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const docRef = await db38().collection("expenses").add({
    organizationId: orgId,
    expenseDate: String(b.expenseDate),
    categoryId: b.categoryId ?? null,
    vendorName: b.vendorName ?? null,
    description: b.description ?? null,
    amount: amount.toFixed(2),
    gstRate: gstRate.toFixed(2),
    gstAmount: gstAmount.toFixed(2),
    total: total.toFixed(2),
    paymentMethod: b.paymentMethod ?? "cash",
    receiptUrl: b.receiptUrl ?? null,
    notes: b.notes ?? null,
    createdAt: now
  });
  await postExpenseJournal(orgId, docRef.id);
  await logAction(req, "CREATE", "expense", docRef.id, `\u20B9${total}`);
  const doc = await docRef.get();
  res.status(201).json(fmt17({ id: doc.id, ...doc.data() }));
});
expensesRouter.patch("/expenses/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const b = req.body ?? {};
  const existingDoc = await db38().collection("expenses").doc(id).get();
  if (!existingDoc.exists || existingDoc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  const existing = existingDoc.data();
  const amount = b.amount !== void 0 ? Number(b.amount) : Number(existing.amount);
  const gstRate = b.gstRate !== void 0 ? Number(b.gstRate) : Number(existing.gstRate);
  const gstAmount = Number((amount * gstRate / 100).toFixed(2));
  const total = Number((amount + gstAmount).toFixed(2));
  const updates = {
    amount: amount.toFixed(2),
    gstRate: gstRate.toFixed(2),
    gstAmount: gstAmount.toFixed(2),
    total: total.toFixed(2)
  };
  for (const f of ["expenseDate", "categoryId", "vendorName", "description", "paymentMethod", "receiptUrl", "notes"]) {
    if (b[f] !== void 0) updates[f] = b[f];
  }
  await db38().collection("expenses").doc(id).update(updates);
  await postExpenseJournal(orgId, id);
  const updatedDoc = await db38().collection("expenses").doc(id).get();
  res.json(fmt17({ id: updatedDoc.id, ...updatedDoc.data() }));
});
expensesRouter.delete("/expenses/:id", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const id = req.params.id;
  const doc = await db38().collection("expenses").doc(id).get();
  if (!doc.exists || doc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db38().collection("expenses").doc(id).delete();
  await reverseAndRepost(orgId, "expense", id, async () => null, { entryDate: /* @__PURE__ */ new Date() });
  res.json({ message: "Deleted" });
});
var expenses_default = expensesRouter;

// src/routes/accounting.ts
var import_express37 = require("express");
var import_exceljs2 = __toESM(require("exceljs"), 1);
var db39 = () => getDb();
var accountingRouter = (0, import_express37.Router)();
function toCsv2(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}
async function sendXlsx2(res, name, sheets) {
  const wb = new import_exceljs2.default.Workbook();
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name.slice(0, 31));
    if (s.rows.length > 0) {
      const headers = Object.keys(s.rows[0]);
      ws.columns = headers.map((h) => ({ header: h, key: h, width: Math.max(12, Math.min(40, h.length + 4)) }));
      ws.getRow(1).font = { bold: true };
      for (const r of s.rows) ws.addRow(r);
    } else {
      ws.addRow(["(no data)"]);
    }
  }
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${name}.xlsx"`);
  const buf = await wb.xlsx.writeBuffer();
  res.end(Buffer.from(buf));
}
accountingRouter.get("/accounts", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  await ensureChartOfAccounts(orgId);
  const snap = await db39().collection("accounts").where("organizationId", "==", orgId).orderBy("code").get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(
    rows.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      subtype: a.subtype ?? null,
      isSystem: a.isSystem,
      isActive: a.isActive,
      createdAt: a.createdAt ?? (/* @__PURE__ */ new Date()).toISOString()
    }))
  );
});
accountingRouter.post("/accounts", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  await ensureChartOfAccounts(orgId);
  const b = req.body ?? {};
  if (!b.code || !b.name || !b.type) {
    res.status(400).json({ error: "code, name, type required" });
    return;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const docRef = await db39().collection("accounts").add({
    organizationId: orgId,
    code: String(b.code),
    name: String(b.name),
    type: b.type,
    subtype: b.subtype ?? null,
    isSystem: false,
    isActive: true,
    createdAt: now
  });
  const doc = await docRef.get();
  res.status(201).json({ id: doc.id, ...doc.data() });
});
accountingRouter.get("/journal-entries", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;
  let query = db39().collection("journal_entries").where("organizationId", "==", orgId);
  if (from) query = query.where("entryDate", ">=", from);
  if (to) query = query.where("entryDate", "<=", to);
  const entriesSnap = await query.orderBy("entryDate", "desc").get();
  const entries = entriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const linesSnap = await db39().collection("journal_lines").where("organizationId", "==", orgId).get();
  const accountsSnap = await db39().collection("accounts").where("organizationId", "==", orgId).get();
  const amap = new Map(accountsSnap.docs.map((d) => [d.id, d.data()]));
  const entryIds = new Set(entries.map((e) => e.id));
  const byEntry = /* @__PURE__ */ new Map();
  for (const lDoc of linesSnap.docs) {
    const l = lDoc.data();
    const entryId = l.entryId;
    if (!entryIds.has(entryId)) continue;
    const arr = byEntry.get(entryId) ?? [];
    arr.push({ id: lDoc.id, ...l });
    byEntry.set(entryId, arr);
  }
  res.json(
    entries.map((e) => ({
      id: e.id,
      entryDate: e.entryDate,
      memo: e.memo ?? null,
      sourceType: e.sourceType ?? null,
      sourceId: e.sourceId ?? null,
      createdAt: e.createdAt ?? (/* @__PURE__ */ new Date()).toISOString(),
      lines: (byEntry.get(e.id) ?? []).map((l) => ({
        id: l.id,
        accountId: l.accountId,
        accountCode: amap.get(l.accountId)?.code ?? "",
        accountName: amap.get(l.accountId)?.name ?? "",
        debit: Number(l.debit ?? 0),
        credit: Number(l.credit ?? 0),
        description: l.description ?? null
      }))
    }))
  );
});
accountingRouter.post("/journal-entries", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const b = req.body ?? {};
  if (!b.entryDate || !Array.isArray(b.lines)) {
    res.status(400).json({ error: "entryDate and lines required" });
    return;
  }
  try {
    const id = await postJournal({
      organizationId: orgId,
      entryDate: new Date(b.entryDate),
      memo: b.memo ?? null,
      sourceType: "manual",
      lines: b.lines.map((l) => ({
        accountCode: l.accountCode,
        debit: l.debit,
        credit: l.credit,
        description: l.description
      }))
    });
    res.status(201).json({ id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
accountingRouter.get("/accounting/ledger", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const accountId = req.query.accountId ? String(req.query.accountId) : null;
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;
  if (!accountId) {
    res.status(400).json({ error: "accountId required" });
    return;
  }
  const acctDoc = await db39().collection("accounts").doc(accountId).get();
  if (!acctDoc.exists || acctDoc.data()?.organizationId !== orgId) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  const acct = acctDoc.data();
  const linesSnap = await db39().collection("journal_lines").where("organizationId", "==", orgId).where("accountId", "==", accountId).get();
  const entryIds = linesSnap.docs.map((d) => d.data().entryId);
  const entriesSnap = entryIds.length > 0 ? await db39().collection("journal_entries").where("entryId", "in", entryIds).get() : { docs: [] };
  const entryMap = /* @__PURE__ */ new Map();
  const uniqueEntryIds = [...new Set(entryIds)];
  for (let i = 0; i < uniqueEntryIds.length; i += 10) {
    const batch = uniqueEntryIds.slice(i, i + 10);
    const batchSnap = await db39().collection("journal_entries").where("entryId", "in", batch).get();
    for (const d of batchSnap.docs) {
      entryMap.set(d.id, d.data());
    }
  }
  for (const entryId of uniqueEntryIds) {
    if (!entryMap.has(entryId)) {
      const entryDoc = await db39().collection("journal_entries").doc(entryId).get();
      if (entryDoc.exists) entryMap.set(entryId, entryDoc.data());
    }
  }
  const rawLines = linesSnap.docs.map((lDoc) => {
    const l = lDoc.data();
    const entry = entryMap.get(l.entryId) ?? {};
    return {
      lineId: lDoc.id,
      entryId: l.entryId,
      debit: l.debit,
      credit: l.credit,
      description: l.description,
      entryDate: entry.entryDate ?? "",
      memo: entry.memo ?? null,
      sourceType: entry.sourceType ?? null,
      sourceId: entry.sourceId ?? null
    };
  });
  const filtered = rawLines.filter((r) => (!from || r.entryDate >= from) && (!to || r.entryDate <= to));
  const sign = acct.type === "asset" || acct.type === "expense" ? 1 : -1;
  let running = 0;
  const lines = filtered.map((r) => {
    running += sign * (Number(r.debit ?? 0) - Number(r.credit ?? 0));
    return {
      lineId: r.lineId,
      entryId: r.entryId,
      entryDate: r.entryDate,
      memo: r.memo ?? null,
      sourceType: r.sourceType ?? null,
      sourceId: r.sourceId ?? null,
      description: r.description ?? null,
      debit: Number(r.debit ?? 0),
      credit: Number(r.credit ?? 0),
      balance: Number(running.toFixed(2))
    };
  });
  res.json({
    account: { id: accountId, code: acct.code, name: acct.name, type: acct.type },
    lines,
    closingBalance: Number(running.toFixed(2))
  });
});
async function pnlForRange(orgId, from, to) {
  const linesSnap = await db39().collection("journal_lines").where("organizationId", "==", orgId).get();
  const entryIds = [...new Set(linesSnap.docs.map((d) => d.data().entryId))];
  const entryMap = /* @__PURE__ */ new Map();
  for (let i = 0; i < entryIds.length; i += 10) {
    const batch = entryIds.slice(i, i + 10);
    const batchSnap = await db39().collection("journal_entries").where("entryId", "in", batch).get();
    for (const d of batchSnap.docs) entryMap.set(d.id, d.data());
  }
  for (const eid of entryIds) {
    if (!entryMap.has(eid)) {
      const ed = await db39().collection("journal_entries").doc(eid).get();
      if (ed.exists) entryMap.set(eid, ed.data());
    }
  }
  const accountsSnap = await db39().collection("accounts").where("organizationId", "==", orgId).get();
  const amap = new Map(accountsSnap.docs.map((d) => [d.id, d.data()]));
  const aggMap = /* @__PURE__ */ new Map();
  for (const lDoc of linesSnap.docs) {
    const l = lDoc.data();
    const entry = entryMap.get(l.entryId);
    if (!entry) continue;
    const entryDate = entry.entryDate;
    if (entryDate < from || entryDate > to) continue;
    const accId = l.accountId;
    const existing = aggMap.get(accId) ?? { debit: 0, credit: 0 };
    existing.debit += Number(l.debit ?? 0);
    existing.credit += Number(l.credit ?? 0);
    aggMap.set(accId, existing);
  }
  const income = [];
  const expense = [];
  for (const [accId, agg] of aggMap) {
    const a = amap.get(accId);
    if (!a) continue;
    const amt = agg.credit - agg.debit;
    if (a.type === "income") income.push({ code: a.code, name: a.name, amount: Number(amt.toFixed(2)) });
    else if (a.type === "expense") expense.push({ code: a.code, name: a.name, amount: Number((-amt).toFixed(2)) });
  }
  const totalIncome = income.reduce((s, x) => s + x.amount, 0);
  const totalExpense = expense.reduce((s, x) => s + x.amount, 0);
  return {
    from,
    to,
    income,
    expense,
    totalIncome: Number(totalIncome.toFixed(2)),
    totalExpense: Number(totalExpense.toFixed(2)),
    netProfit: Number((totalIncome - totalExpense).toFixed(2))
  };
}
accountingRouter.get("/accounting/pnl", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const now = /* @__PURE__ */ new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = now.toISOString().slice(0, 10);
  const from = String(req.query.from ?? defaultFrom);
  const to = String(req.query.to ?? defaultTo);
  const current = await pnlForRange(orgId, from, to);
  let previous = null;
  if (req.query.compare === "true") {
    const ms = new Date(to).getTime() - new Date(from).getTime();
    const prevTo = new Date(new Date(from).getTime() - 864e5).toISOString().slice(0, 10);
    const prevFrom = new Date(new Date(from).getTime() - 864e5 - ms).toISOString().slice(0, 10);
    previous = await pnlForRange(orgId, prevFrom, prevTo);
  }
  res.json({ current, previous });
});
async function gstr1Data(orgId, from, to) {
  const invSnap = await db39().collection("invoices").where("organizationId", "==", orgId).where("issueDate", ">=", new Date(from)).where("issueDate", "<=", /* @__PURE__ */ new Date(to + "T23:59:59")).get();
  const invs = invSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((inv) => inv.status !== "cancelled" && inv.status !== "draft");
  const clientsSnap = await db39().collection("clients").where("organizationId", "==", orgId).get();
  const cmap = new Map(clientsSnap.docs.map((c) => [c.id, c.data()]));
  const b2b = [];
  const b2c = [];
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  for (const inv of invs) {
    const c = inv.clientId ? cmap.get(inv.clientId) : null;
    const row = {
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.issueDate instanceof Date ? inv.issueDate.toISOString().slice(0, 10) : String(inv.issueDate).slice(0, 10),
      clientName: c?.name ?? "",
      gstin: c?.gstNumber ?? "",
      placeOfSupply: inv.buyerState ?? "",
      taxableValue: Number(inv.taxableAmount ?? 0),
      rate: Number(inv.taxRate ?? 0),
      cgst: Number(inv.cgst ?? 0),
      sgst: Number(inv.sgst ?? 0),
      igst: Number(inv.igst ?? 0),
      invoiceTotal: Number(inv.total ?? 0)
    };
    totalTaxable += row.taxableValue;
    totalCgst += row.cgst;
    totalSgst += row.sgst;
    totalIgst += row.igst;
    if (c?.gstNumber) b2b.push(row);
    else b2c.push(row);
  }
  return {
    from,
    to,
    b2b,
    b2c,
    summary: {
      invoices: invs.length,
      taxableValue: Number(totalTaxable.toFixed(2)),
      cgst: Number(totalCgst.toFixed(2)),
      sgst: Number(totalSgst.toFixed(2)),
      igst: Number(totalIgst.toFixed(2)),
      totalTax: Number((totalCgst + totalSgst + totalIgst).toFixed(2))
    }
  };
}
accountingRouter.get("/accounting/gstr1", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const now = /* @__PURE__ */ new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = now.toISOString().slice(0, 10);
  const from = String(req.query.from ?? defaultFrom);
  const to = String(req.query.to ?? defaultTo);
  const data = await gstr1Data(orgId, from, to);
  const format = String(req.query.format ?? "json");
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="gstr1-${from}_${to}.csv"`);
    const csv = [
      "# GSTR-1 Summary",
      `Period,${from},to,${to}`,
      `Invoices,${data.summary.invoices}`,
      `Taxable,${data.summary.taxableValue}`,
      `CGST,${data.summary.cgst}`,
      `SGST,${data.summary.sgst}`,
      `IGST,${data.summary.igst}`,
      "",
      "# B2B",
      toCsv2(data.b2b),
      "",
      "# B2C",
      toCsv2(data.b2c)
    ].join("\n");
    res.send(csv);
    return;
  }
  if (format === "xlsx") {
    void sendXlsx2(res, `gstr1-${from}_${to}`, [
      { name: "Summary", rows: [data.summary] },
      { name: "B2B", rows: data.b2b },
      { name: "B2C", rows: data.b2c }
    ]);
    return;
  }
  res.json(data);
});
accountingRouter.get("/accounting/gstr3b", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const now = /* @__PURE__ */ new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = now.toISOString().slice(0, 10);
  const from = String(req.query.from ?? defaultFrom);
  const to = String(req.query.to ?? defaultTo);
  const outward = await gstr1Data(orgId, from, to);
  const expSnap = await db39().collection("expenses").where("organizationId", "==", orgId).where("expenseDate", ">=", from).where("expenseDate", "<=", to).get();
  const expInputGst = expSnap.docs.reduce((s, e) => s + Number(e.data().gstAmount ?? 0), 0);
  const billsSnap = await db39().collection("vendor_bills").where("organizationId", "==", orgId).where("issueDate", ">=", new Date(from)).where("issueDate", "<=", /* @__PURE__ */ new Date(to + "T23:59:59")).get();
  const activeBills = billsSnap.docs.filter((bDoc) => {
    const status = bDoc.data().status;
    return status !== "cancelled" && status !== "draft";
  });
  const billInputGst = activeBills.reduce((s, bDoc) => s + Number(bDoc.data().taxAmount ?? 0), 0);
  const totalItc = Number((expInputGst + billInputGst).toFixed(2));
  const netTaxPayable = Number((outward.summary.cgst + outward.summary.sgst + outward.summary.igst - totalItc).toFixed(2));
  const data = {
    from,
    to,
    outwardSupplies: {
      taxable: outward.summary.taxableValue,
      cgst: outward.summary.cgst,
      sgst: outward.summary.sgst,
      igst: outward.summary.igst
    },
    itc: {
      cgstSgstInputs: Number((expInputGst + billInputGst).toFixed(2)),
      igstInputs: 0,
      total: totalItc
    },
    netTaxPayable
  };
  const format = String(req.query.format ?? "json");
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="gstr3b-${from}_${to}.csv"`);
    const csv = [
      "# GSTR-3B Summary",
      `Period,${from},to,${to}`,
      `Outward taxable,${data.outwardSupplies.taxable}`,
      `Outward CGST,${data.outwardSupplies.cgst}`,
      `Outward SGST,${data.outwardSupplies.sgst}`,
      `Outward IGST,${data.outwardSupplies.igst}`,
      `ITC total,${data.itc.total}`,
      `Net tax payable,${data.netTaxPayable}`
    ].join("\n");
    res.send(csv);
    return;
  }
  if (format === "xlsx") {
    void sendXlsx2(res, `gstr3b-${from}_${to}`, [{ name: "GSTR-3B", rows: [data.outwardSupplies, data.itc, { netTaxPayable: data.netTaxPayable }] }]);
    return;
  }
  res.json(data);
});
function fiscalYearStart(asOf) {
  const d = new Date(asOf);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const startYear = m >= 3 ? y : y - 1;
  return `${startYear}-04-01`;
}
async function balanceSheetData(orgId, asOf) {
  await ensureChartOfAccounts(orgId);
  const fyStart = fiscalYearStart(asOf);
  const linesSnap = await db39().collection("journal_lines").where("organizationId", "==", orgId).get();
  const entryIds = [...new Set(linesSnap.docs.map((d) => d.data().entryId))];
  const entryMap = /* @__PURE__ */ new Map();
  for (let i = 0; i < entryIds.length; i += 10) {
    const batch = entryIds.slice(i, i + 10);
    const batchSnap = await db39().collection("journal_entries").where("entryId", "in", batch).get();
    for (const d of batchSnap.docs) entryMap.set(d.id, d.data());
  }
  for (const eid of entryIds) {
    if (!entryMap.has(eid)) {
      const ed = await db39().collection("journal_entries").doc(eid).get();
      if (ed.exists) entryMap.set(eid, ed.data());
    }
  }
  const accountsSnap = await db39().collection("accounts").where("organizationId", "==", orgId).get();
  const amap = new Map(accountsSnap.docs.map((d) => [d.id, d.data()]));
  const allRows = /* @__PURE__ */ new Map();
  const priorRows = /* @__PURE__ */ new Map();
  for (const lDoc of linesSnap.docs) {
    const l = lDoc.data();
    const entry = entryMap.get(l.entryId);
    if (!entry) continue;
    const entryDate = entry.entryDate;
    const accId = l.accountId;
    const dr = Number(l.debit ?? 0);
    const cr = Number(l.credit ?? 0);
    if (entryDate <= asOf) {
      const agg = allRows.get(accId) ?? { debit: 0, credit: 0 };
      agg.debit += dr;
      agg.credit += cr;
      allRows.set(accId, agg);
    }
    if (entryDate < fyStart) {
      const agg = priorRows.get(accId) ?? { debit: 0, credit: 0 };
      agg.debit += dr;
      agg.credit += cr;
      priorRows.set(accId, agg);
    }
  }
  const assets = [];
  const liabilities = [];
  const equity = [];
  let pyIncome = 0;
  let pyExpense = 0;
  let totalIncome = 0;
  let totalExpense = 0;
  for (const [accId, agg] of allRows) {
    const a = amap.get(accId);
    if (!a) continue;
    const dr = agg.debit;
    const cr = agg.credit;
    if (a.type === "asset") {
      const amt = dr - cr;
      if (Math.abs(amt) > 5e-3) assets.push({ code: a.code, name: a.name, amount: Number(amt.toFixed(2)) });
    } else if (a.type === "liability") {
      const amt = cr - dr;
      if (Math.abs(amt) > 5e-3) liabilities.push({ code: a.code, name: a.name, amount: Number(amt.toFixed(2)) });
    } else if (a.type === "equity") {
      const amt = cr - dr;
      if (Math.abs(amt) > 5e-3) equity.push({ code: a.code, name: a.name, amount: Number(amt.toFixed(2)) });
    } else if (a.type === "income") {
      totalIncome += cr - dr;
    } else if (a.type === "expense") {
      totalExpense += dr - cr;
    }
  }
  for (const [accId, agg] of priorRows) {
    const a = amap.get(accId);
    if (!a) continue;
    const dr = agg.debit;
    const cr = agg.credit;
    if (a.type === "income") pyIncome += cr - dr;
    else if (a.type === "expense") pyExpense += dr - cr;
  }
  const openingRetainedEarnings = Number((pyIncome - pyExpense).toFixed(2));
  const cumulativeNetProfit = totalIncome - totalExpense;
  const periodNetProfit = Number((cumulativeNetProfit - (pyIncome - pyExpense)).toFixed(2));
  const openingEquity = Number(equity.reduce((s, e) => s + e.amount, 0).toFixed(2));
  const equityWithRetained = [...equity];
  if (Math.abs(openingRetainedEarnings) > 5e-3) {
    equityWithRetained.push({ code: "RE", name: "Retained Earnings (prior years)", amount: openingRetainedEarnings });
  }
  if (Math.abs(periodNetProfit) > 5e-3) {
    equityWithRetained.push({ code: "PNL", name: "Net Profit (current period)", amount: periodNetProfit });
  }
  assets.sort((a, b) => a.code.localeCompare(b.code));
  liabilities.sort((a, b) => a.code.localeCompare(b.code));
  const totalAssets = Number(assets.reduce((s, x) => s + x.amount, 0).toFixed(2));
  const totalLiabilities = Number(liabilities.reduce((s, x) => s + x.amount, 0).toFixed(2));
  const totalEquity = Number(equityWithRetained.reduce((s, x) => s + x.amount, 0).toFixed(2));
  const liabilitiesAndEquity = Number((totalLiabilities + totalEquity).toFixed(2));
  const difference = Number((totalAssets - liabilitiesAndEquity).toFixed(2));
  return {
    asOf,
    assets,
    liabilities,
    equity: equityWithRetained,
    totals: {
      assets: totalAssets,
      liabilities: totalLiabilities,
      equity: totalEquity,
      liabilitiesAndEquity,
      difference
    },
    equityReconciliation: {
      fyStart,
      openingEquity,
      openingRetainedEarnings,
      periodNetProfit,
      totalEquity
    }
  };
}
accountingRouter.get("/accounting/balance-sheet", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const asOf = String(req.query.asOf ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
  const data = await balanceSheetData(orgId, asOf);
  const format = String(req.query.format ?? "json");
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="balance-sheet-${asOf}.csv"`);
    const lines = [];
    lines.push(`# Balance Sheet as of ${asOf}`);
    lines.push("");
    lines.push("# Assets");
    lines.push("Code,Name,Amount");
    for (const a of data.assets) lines.push(`${a.code},${a.name},${a.amount}`);
    lines.push(`,Total Assets,${data.totals.assets}`);
    lines.push("");
    lines.push("# Liabilities");
    lines.push("Code,Name,Amount");
    for (const a of data.liabilities) lines.push(`${a.code},${a.name},${a.amount}`);
    lines.push(`,Total Liabilities,${data.totals.liabilities}`);
    lines.push("");
    lines.push("# Equity");
    lines.push("Code,Name,Amount");
    for (const a of data.equity) lines.push(`${a.code},${a.name},${a.amount}`);
    lines.push(`,Total Equity,${data.totals.equity}`);
    lines.push("");
    lines.push(`,Liabilities + Equity,${data.totals.liabilitiesAndEquity}`);
    lines.push(`,Difference,${data.totals.difference}`);
    res.send(lines.join("\n"));
    return;
  }
  if (format === "xlsx") {
    void sendXlsx2(res, `balance-sheet-${asOf}`, [
      { name: "Assets", rows: [...data.assets, { code: "", name: "Total Assets", amount: data.totals.assets }] },
      { name: "Liabilities", rows: [...data.liabilities, { code: "", name: "Total Liabilities", amount: data.totals.liabilities }] },
      { name: "Equity", rows: [...data.equity, { code: "", name: "Total Equity", amount: data.totals.equity }] },
      { name: "Summary", rows: [{ ...data.totals, asOf }] },
      { name: "Reconciliation", rows: [data.equityReconciliation] }
    ]);
    return;
  }
  res.json(data);
});
accountingRouter.get("/accounting/vendor-ageing", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const billsSnap = await db39().collection("vendor_bills").where("organizationId", "==", orgId).get();
  const activeBills = billsSnap.docs.filter((bDoc) => {
    const status = bDoc.data().status;
    return status !== "paid" && status !== "cancelled" && status !== "draft";
  });
  const vrowsSnap = await db39().collection("vendors").where("organizationId", "==", orgId).get();
  const vmap = new Map(vrowsSnap.docs.map((v) => [v.id, v.data()]));
  const now = Date.now();
  const buckets = /* @__PURE__ */ new Map();
  for (const bDoc of activeBills) {
    const b = bDoc.data();
    const bal = Number(b.total ?? 0) - Number(b.amountPaid ?? 0);
    if (bal <= 0) continue;
    const vid = b.vendorId ?? "unknown";
    const vname = vmap.get(vid)?.name ?? "Unknown";
    const dueDate = b.dueDate instanceof Date ? b.dueDate.getTime() : new Date(b.dueDate).getTime();
    const issueDate = b.issueDate instanceof Date ? b.issueDate.getTime() : new Date(b.issueDate).getTime();
    const ref = dueDate || issueDate;
    const age = Math.max(0, Math.floor((now - ref) / 864e5));
    const k = buckets.get(vid) ?? { vendorId: vid, vendorName: vname, current: 0, days30: 0, days60: 0, days90: 0, daysOver90: 0, total: 0 };
    if (age <= 0) k.current += bal;
    else if (age <= 30) k.days30 += bal;
    else if (age <= 60) k.days60 += bal;
    else if (age <= 90) k.days90 += bal;
    else k.daysOver90 += bal;
    k.total += bal;
    buckets.set(vid, k);
  }
  res.json([...buckets.values()].sort((a, b) => b.total - a.total));
});
var accounting_default = accountingRouter;

// src/routes/push.ts
var import_express38 = require("express");

// src/lib/push.ts
init_logger();
var db40 = () => getDb();
var EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
async function sendExpoBatch(tokens, payload) {
  if (tokens.length === 0) return { sent: 0, failed: 0, invalidTokens: [] };
  const messages = tokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    sound: payload.sound ?? "default",
    channelId: payload.channelId ?? "default",
    priority: "high"
  }));
  try {
    const resp = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(15e3)
    });
    if (!resp.ok) {
      logger.warn({ status: resp.status }, "Expo push HTTP error");
      return { sent: 0, failed: tokens.length, invalidTokens: [] };
    }
    const data = await resp.json();
    const tickets = Array.isArray(data.data) ? data.data : [];
    let sent = 0;
    let failed = 0;
    const invalidTokens = [];
    tickets.forEach((t, i) => {
      if (t.status === "ok") sent++;
      else {
        failed++;
        if (t.details?.error === "DeviceNotRegistered") {
          invalidTokens.push(tokens[i]);
        }
      }
    });
    return { sent, failed, invalidTokens };
  } catch (err) {
    logger.error({ err }, "Expo push send failed");
    return { sent: 0, failed: tokens.length, invalidTokens: [] };
  }
}
async function sendPushToTokens(tokens, payload) {
  if (tokens.length === 0) return { sent: 0, failed: 0 };
  let sent = 0;
  let failed = 0;
  const invalid = [];
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100);
    const r = await sendExpoBatch(batch, payload);
    sent += r.sent;
    failed += r.failed;
    invalid.push(...r.invalidTokens);
  }
  if (invalid.length > 0) {
    try {
      const writeBatch = db40().batch();
      for (const token of invalid) {
        const snap = await db40().collection("pushTokens").where("token", "==", token).get();
        for (const doc of snap.docs) {
          writeBatch.delete(doc.ref);
        }
      }
      await writeBatch.commit();
    } catch (err) {
      logger.warn({ err }, "Failed to prune invalid push tokens");
    }
  }
  return { sent, failed };
}
async function sendPushToUser(userId, payload) {
  const snap = await db40().collection("pushTokens").where("userId", "==", userId).get();
  return sendPushToTokens(snap.docs.map((d) => d.data().token), payload);
}

// src/routes/push.ts
var db41 = () => getDb();
var pushRouter = (0, import_express38.Router)();
pushRouter.post("/push/register", requireAuth, async (req, res) => {
  const { token, platform, deviceName } = req.body ?? {};
  if (typeof token !== "string" || !token) {
    res.status(400).json({ error: "token is required" });
    return;
  }
  const plat = ["ios", "android", "web"].includes(platform) ? platform : "android";
  const userId = req.user.userId;
  const orgId = req.user.organizationId;
  const existingSnap = await db41().collection("push_tokens").where("token", "==", token).limit(1).get();
  if (!existingSnap.empty) {
    const doc = existingSnap.docs[0];
    await doc.ref.update({ userId, organizationId: orgId, platform: plat, deviceName: deviceName ?? null, lastUsedAt: (/* @__PURE__ */ new Date()).toISOString() });
    res.json({ id: doc.id, token, platform: plat });
    return;
  }
  const ref = await db41().collection("push_tokens").add({ userId, organizationId: orgId, token, platform: plat, deviceName: deviceName ?? null, createdAt: (/* @__PURE__ */ new Date()).toISOString(), lastUsedAt: (/* @__PURE__ */ new Date()).toISOString() });
  res.status(201).json({ id: ref.id, token, platform: plat });
});
pushRouter.delete("/push/register", requireAuth, async (req, res) => {
  const { token } = req.body ?? {};
  if (typeof token !== "string") {
    res.status(400).json({ error: "token is required" });
    return;
  }
  const snap = await db41().collection("push_tokens").where("token", "==", token).get();
  for (const doc of snap.docs) {
    await doc.ref.delete();
  }
  res.json({ message: "Token unregistered" });
});
pushRouter.get("/push/tokens", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const snap = await db41().collection("push_tokens").where("organizationId", "==", orgId).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(
    rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      platform: r.platform,
      deviceName: r.deviceName ?? null,
      createdAt: r.createdAt,
      lastUsedAt: r.lastUsedAt
    }))
  );
});
pushRouter.post("/push/test", requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const { title, body } = req.body ?? {};
  const result = await sendPushToUser(userId, {
    title: typeof title === "string" ? title : "MSME Pro test",
    body: typeof body === "string" ? body : "Push notifications are working.",
    data: { type: "test" }
  });
  res.json(result);
});
var push_default = pushRouter;

// src/routes/whatsapp.ts
var import_express39 = require("express");
var import_node_crypto4 = __toESM(require("node:crypto"), 1);
init_logger();
var db42 = () => getDb();
var whatsappRouter = (0, import_express39.Router)();
function fmt18(m) {
  return {
    id: m.id,
    leadId: m.leadId ?? null,
    clientId: m.clientId ?? null,
    direction: m.direction,
    phone: m.phone,
    body: m.body ?? null,
    templateName: m.templateName ?? null,
    templateLanguage: m.templateLanguage ?? null,
    templateVariables: m.templateVariables ?? [],
    status: m.status,
    providerMessageId: m.providerMessageId ?? null,
    errorMessage: m.errorMessage ?? null,
    createdAt: m.createdAt
  };
}
function verifySignature(rawBody, header, appSecret) {
  if (!rawBody || !header || !appSecret) return false;
  const expected = "sha256=" + import_node_crypto4.default.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  try {
    return import_node_crypto4.default.timingSafeEqual(Buffer.from(expected), Buffer.from(header));
  } catch {
    return false;
  }
}
async function getConfig(orgId) {
  const snap = await db42().collection("integrations").where("organizationId", "==", orgId).where("provider", "==", "whatsapp").limit(1).get();
  if (snap.empty) return null;
  const row = snap.docs[0].data();
  if (!row.enabled) return null;
  return row.config ?? {};
}
whatsappRouter.get("/whatsapp/messages", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const { leadId } = req.query;
  let q = db42().collection("whatsapp_messages").where("organizationId", "==", orgId);
  if (leadId) q = q.where("leadId", "==", leadId);
  const snap = await q.orderBy("createdAt", "desc").limit(200).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(rows.map(fmt18));
});
whatsappRouter.post("/whatsapp/send", requireAuth, async (req, res) => {
  const orgId = req.user.organizationId;
  const { phone, body, templateName, templateLanguage, templateVariables, leadId, clientId } = req.body ?? {};
  if (typeof phone !== "string" || !phone) {
    res.status(400).json({ error: "phone is required" });
    return;
  }
  if (!body && !templateName) {
    res.status(400).json({ error: "Either body or templateName is required" });
    return;
  }
  const cfg = await getConfig(orgId);
  const vars = Array.isArray(templateVariables) ? templateVariables.map(String) : [];
  const ref = await db42().collection("whatsapp_messages").add({
    organizationId: orgId,
    direction: "outbound",
    phone,
    body: body ?? null,
    templateName: templateName ?? null,
    templateLanguage: templateLanguage ?? "en_US",
    templateVariables: vars,
    leadId: typeof leadId === "string" ? leadId : null,
    clientId: typeof clientId === "string" ? clientId : null,
    status: "queued",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (!cfg || !cfg.accessToken || !cfg.phoneNumberId) {
    await ref.update({ status: "failed", errorMessage: "WhatsApp not configured" });
    res.status(400).json({ error: "WhatsApp integration not configured" });
    return;
  }
  const payload = templateName ? {
    messaging_product: "whatsapp",
    to: phone.replace(/[^\d]/g, ""),
    type: "template",
    template: {
      name: templateName,
      language: { code: templateLanguage ?? "en_US" },
      components: vars.length > 0 ? [{ type: "body", parameters: vars.map((text) => ({ type: "text", text })) }] : []
    }
  } : {
    messaging_product: "whatsapp",
    to: phone.replace(/[^\d]/g, ""),
    type: "text",
    text: { body }
  };
  try {
    const resp = await fetch(`https://graph.facebook.com/v20.0/${cfg.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15e3)
    });
    const data = await resp.json();
    if (!resp.ok || data.error) {
      const msg = data.error?.message ?? `HTTP ${resp.status}`;
      await ref.update({ status: "failed", errorMessage: msg });
      res.status(502).json({ error: msg });
      return;
    }
    const providerId = data.messages?.[0]?.id ?? null;
    await ref.update({ status: "sent", providerMessageId: providerId });
    if (leadId) {
      await db42().collection("lead_activities").add({
        organizationId: orgId,
        leadId,
        type: "note",
        title: "WhatsApp sent",
        body: body ?? `Template: ${templateName}`,
        userId: req.user.userId,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    const updatedSnap = await ref.get();
    res.json(fmt18({ id: updatedSnap.id, ...updatedSnap.data() }));
  } catch (err) {
    const msg = err.message;
    await ref.update({ status: "failed", errorMessage: msg });
    res.status(502).json({ error: msg });
  }
});
whatsappRouter.get("/whatsapp/webhook", async (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const all = await db42().collection("integrations").where("provider", "==", "whatsapp").get();
  const ok = all.docs.some((row) => {
    const cfg = row.data().config ?? {};
    return cfg.verifyToken && cfg.verifyToken === token;
  });
  if (mode === "subscribe" && ok && typeof challenge === "string") {
    res.status(200).send(challenge);
    return;
  }
  res.status(403).send("forbidden");
});
whatsappRouter.post("/whatsapp/webhook", async (req, res) => {
  const body = req.body;
  const entries = Array.isArray(body?.entry) ? body.entry : [];
  const signature = (req.header("x-hub-signature-256") ?? req.header("X-Hub-Signature-256")) || void 0;
  const rawBody = req.rawBody;
  const allIntegrations = await db42().collection("integrations").where("provider", "==", "whatsapp").get();
  const intDocs = allIntegrations.docs.map((d) => ({ id: d.id, ...d.data() }));
  const anyMatch = intDocs.some((row) => {
    const cfg = row.config ?? {};
    return cfg.appSecret && verifySignature(rawBody, signature, cfg.appSecret);
  });
  if (!anyMatch) {
    logger.warn({ signature: signature ? "present" : "missing" }, "WhatsApp webhook signature verification failed");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }
  res.status(200).json({ received: true });
  try {
    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change.value ?? {};
        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) continue;
        const match = intDocs.find((row) => {
          const cfg = row.config ?? {};
          return cfg.phoneNumberId === phoneNumberId && cfg.appSecret && verifySignature(rawBody, signature, cfg.appSecret);
        });
        if (!match) {
          logger.warn({ phoneNumberId }, "WhatsApp webhook: no signature-verified org for phoneNumberId");
          continue;
        }
        const orgId = match.organizationId;
        for (const st of value.statuses ?? []) {
          if (!st.id) continue;
          const allowed = ["sent", "delivered", "read", "failed"];
          const status = allowed.includes(st.status) ? st.status : null;
          if (!status) continue;
          const msgSnap = await db42().collection("whatsapp_messages").where("providerMessageId", "==", st.id).limit(1).get();
          for (const doc of msgSnap.docs) {
            await doc.ref.update({ status });
          }
        }
        for (const m of value.messages ?? []) {
          if (!m.from) continue;
          const leadSnap = await db42().collection("leads").where("organizationId", "==", orgId).where("phone", "==", m.from).limit(1).get();
          let leadId = leadSnap.empty ? null : leadSnap.docs[0].id;
          let clientId = null;
          if (!leadId) {
            const clientSnap = await db42().collection("clients").where("organizationId", "==", orgId).where("phone", "==", m.from).limit(1).get();
            clientId = clientSnap.empty ? null : clientSnap.docs[0].id;
            if (!clientId) {
              const sc = scoreLead({ source: "whatsapp", phone: m.from });
              const newLeadRef = await db42().collection("leads").add({
                organizationId: orgId,
                name: `WhatsApp ${m.from}`,
                phone: m.from,
                source: "whatsapp",
                externalId: m.id ?? null,
                status: "new",
                priority: sc.priority,
                score: sc.score,
                notes: m.text?.body ?? null,
                nextAction: sc.nextAction,
                createdAt: (/* @__PURE__ */ new Date()).toISOString(),
                updatedAt: (/* @__PURE__ */ new Date()).toISOString()
              });
              leadId = newLeadRef.id;
            }
          }
          await db42().collection("whatsapp_messages").add({
            organizationId: orgId,
            leadId,
            clientId,
            direction: "inbound",
            phone: m.from,
            body: m.text?.body ?? null,
            status: "received",
            providerMessageId: m.id ?? null,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          });
          if (leadId) {
            await db42().collection("lead_activities").add({
              organizationId: orgId,
              leadId,
              type: "note",
              title: "WhatsApp received",
              body: m.text?.body ?? "(no text)",
              createdAt: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "WhatsApp webhook processing failed");
  }
});
var whatsapp_default = whatsappRouter;

// src/routes/lead-sources.ts
var import_express40 = require("express");
var db43 = () => getDb();
var leadSourcesRouter = (0, import_express40.Router)();
async function importLeads(orgId, source, leads) {
  let imported = 0;
  for (const l of leads) {
    if (!l.externalId) continue;
    const existsSnap = await db43().collection("leads").where("organizationId", "==", orgId).where("externalId", "==", l.externalId).limit(1).get();
    if (!existsSnap.empty) continue;
    const sc = scoreLead({ source, phone: l.phone ?? void 0, email: l.email ?? void 0 });
    await db43().collection("leads").add({
      organizationId: orgId,
      name: l.name || "Lead",
      email: l.email ?? null,
      phone: l.phone ?? null,
      company: l.company ?? null,
      city: l.city ?? null,
      state: l.state ?? null,
      source,
      externalId: l.externalId,
      status: "new",
      priority: sc.priority,
      score: sc.score,
      product: l.product ?? null,
      notes: l.notes ?? null,
      nextAction: sc.nextAction,
      metadata: l.metadata ?? null,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    imported++;
  }
  return imported;
}
async function recordSync(orgId, provider, status, message) {
  const snap = await db43().collection("integrations").where("organizationId", "==", orgId).where("provider", "==", provider).limit(1).get();
  for (const doc of snap.docs) {
    await doc.ref.update({ lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString(), lastSyncStatus: status, lastSyncMessage: message });
  }
}
async function getIntegrationConfig(orgId, provider) {
  const snap = await db43().collection("integrations").where("organizationId", "==", orgId).where("provider", "==", provider).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].data().config ?? null;
}
leadSourcesRouter.post("/integrations/tradeindia/sync", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user.organizationId;
  const cfg = await getIntegrationConfig(orgId, "tradeindia");
  if (!cfg?.userId || !cfg?.profileId || !cfg?.key) {
    res.status(400).json({ error: "TradeIndia integration not configured (need userId, profileId, key)." });
    return;
  }
  try {
    const since = new Date(Date.now() - 7 * 864e5);
    const fromDate = since.toISOString().slice(0, 10);
    const toDate = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const url = `https://www.tradeindia.com/utils/my_inquiry.html?userid=${encodeURIComponent(cfg.userId)}&profile_id=${encodeURIComponent(cfg.profileId)}&key=${encodeURIComponent(cfg.key)}&from_date=${fromDate}&to_date=${toDate}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(15e3) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const items = Array.isArray(data) ? data : Array.isArray(data.inquiries) ? data.inquiries : [];
    const normalized = items.map((it) => ({
      externalId: String(it.inquiry_id ?? it.id ?? `${it.email ?? ""}-${it.phone_no ?? ""}`),
      name: it.name ?? it.contact_person ?? "TradeIndia lead",
      email: it.email ?? null,
      phone: it.phone_no ?? it.mobile ?? null,
      company: it.company ?? null,
      city: it.city ?? null,
      state: it.state ?? null,
      product: it.subject ?? it.product ?? null,
      notes: it.message ?? null,
      metadata: { receivedAt: it.date ?? null }
    }));
    const imported = await importLeads(orgId, "tradeindia", normalized);
    const message = `Imported ${imported} new leads from TradeIndia.`;
    await recordSync(orgId, "tradeindia", "success", message);
    res.json({ imported, message });
  } catch (e) {
    const message = e.message;
    await recordSync(orgId, "tradeindia", "error", message);
    res.status(502).json({ imported: 0, message: `Sync failed: ${message}` });
  }
});
leadSourcesRouter.post("/integrations/justdial/sync", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user.organizationId;
  const cfg = await getIntegrationConfig(orgId, "justdial");
  if (!cfg?.authKey || !cfg?.userId) {
    res.status(400).json({ error: "JustDial integration not configured (need userId, authKey)." });
    return;
  }
  try {
    const resp = await fetch("https://api.justdial.com/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.authKey}` },
      body: JSON.stringify({ userId: cfg.userId, days: 7 }),
      signal: AbortSignal.timeout(15e3)
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const items = Array.isArray(data.leads) ? data.leads : [];
    const normalized = items.map((it) => ({
      externalId: String(it.leadid ?? it.id ?? `${it.email ?? ""}-${it.mobile ?? ""}`),
      name: it.prefix ? `${it.prefix} ${it.name ?? ""}`.trim() : it.name ?? "JustDial lead",
      email: it.email ?? null,
      phone: it.mobile ?? it.phone ?? null,
      city: it.city ?? null,
      product: it.category ?? null,
      notes: it.requirement ?? it.message ?? null,
      metadata: { source_label: it.source ?? null }
    }));
    const imported = await importLeads(orgId, "justdial", normalized);
    const message = `Imported ${imported} new leads from JustDial.`;
    await recordSync(orgId, "justdial", "success", message);
    res.json({ imported, message });
  } catch (e) {
    const message = e.message;
    await recordSync(orgId, "justdial", "error", message);
    res.status(502).json({ imported: 0, message: `Sync failed: ${message}` });
  }
});
leadSourcesRouter.post("/integrations/fb-lead-ads/sync", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user.organizationId;
  const cfg = await getIntegrationConfig(orgId, "fb_lead_ads");
  if (!cfg?.accessToken || !cfg?.formIds) {
    res.status(400).json({ error: "FB Lead Ads not configured (need accessToken, formIds)." });
    return;
  }
  const formIds = cfg.formIds.split(",").map((s) => s.trim()).filter(Boolean);
  let imported = 0;
  try {
    for (const formId of formIds) {
      const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(formId)}/leads?access_token=${encodeURIComponent(cfg.accessToken)}&limit=50`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(15e3) });
      if (!resp.ok) throw new Error(`Form ${formId}: HTTP ${resp.status}`);
      const data = await resp.json();
      const items = Array.isArray(data.data) ? data.data : [];
      const normalized = items.map((it) => {
        const fields = /* @__PURE__ */ new Map();
        for (const fd of it.field_data ?? []) {
          fields.set(fd.name.toLowerCase(), Array.isArray(fd.values) ? fd.values.join(", ") : "");
        }
        return {
          externalId: it.id,
          name: fields.get("full_name") ?? fields.get("first_name") ?? fields.get("name") ?? "FB lead",
          email: fields.get("email") ?? null,
          phone: fields.get("phone_number") ?? fields.get("phone") ?? null,
          company: fields.get("company_name") ?? fields.get("company") ?? null,
          city: fields.get("city") ?? null,
          state: fields.get("state") ?? null,
          product: fields.get("product") ?? null,
          notes: fields.get("message") ?? fields.get("comments") ?? null,
          metadata: { formId, createdTime: it.created_time }
        };
      });
      imported += await importLeads(orgId, "fb_lead_ads", normalized);
    }
    const message = `Imported ${imported} new leads from Facebook Lead Ads (${formIds.length} forms).`;
    await recordSync(orgId, "fb_lead_ads", "success", message);
    res.json({ imported, message });
  } catch (e) {
    const message = e.message;
    await recordSync(orgId, "fb_lead_ads", "error", message);
    res.status(502).json({ imported, message: `Sync failed: ${message}` });
  }
});
var lead_sources_default = leadSourcesRouter;

// src/routes/daily-reports.ts
var import_express41 = require("express");
var db44 = () => getDb();
var dailyReportsRouter = (0, import_express41.Router)();
dailyReportsRouter.get("/daily-reports", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const role = req.user.role;
    const userId = req.user.userId;
    const { date, userId: filterUserId } = req.query;
    let query = db44().collection("dailyReports").where("organizationId", "==", orgId);
    if (role === "sales_executive" || role === "sales" || role === "viewer") {
      query = query.where("userId", "==", userId);
    } else if (filterUserId && typeof filterUserId === "string") {
      query = query.where("userId", "==", filterUserId);
    }
    if (date && typeof date === "string") {
      query = query.where("date", "==", date);
    }
    const snap = await query.orderBy("date", "desc").limit(100).get();
    const reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(reports);
  } catch (err) {
    console.error("Failed to fetch daily reports:", err);
    res.status(500).json({ error: "Failed to fetch daily reports" });
  }
});
dailyReportsRouter.get("/daily-reports/:id", requireAuth, async (req, res) => {
  try {
    const doc = await db44().collection("dailyReports").doc(req.params.id).get();
    if (!doc.exists) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    const data = doc.data();
    if (data.organizationId !== req.user.organizationId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    res.json({ id: doc.id, ...data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch report" });
  }
});
dailyReportsRouter.post("/daily-reports", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const userId = req.user.userId;
    const {
      date,
      callsMade,
      quotationsSent,
      meetingsScheduled,
      ordersReceived,
      paymentReminders,
      afterSalesFollowup,
      crmChecklist,
      ordersClosed,
      pendingFollowups,
      issuesSupport,
      tomorrowPriority,
      status
    } = req.body ?? {};
    if (!date) {
      res.status(400).json({ error: "date is required" });
      return;
    }
    const existingSnap = await db44().collection("dailyReports").where("organizationId", "==", orgId).where("userId", "==", userId).where("date", "==", date).limit(1).get();
    const reportData = {
      organizationId: orgId,
      userId,
      date,
      callsMade: Number(callsMade) || 0,
      quotationsSent: Number(quotationsSent) || 0,
      meetingsScheduled: Number(meetingsScheduled) || 0,
      ordersReceived: Number(ordersReceived) || 0,
      paymentReminders: Number(paymentReminders) || 0,
      afterSalesFollowup: Number(afterSalesFollowup) || 0,
      crmChecklist: crmChecklist ?? {
        callsUpdated: false,
        quotationsUpdated: false,
        followupsScheduled: false,
        customerNotesUpdated: false,
        noFollowupMissed: false
      },
      ordersClosed: ordersClosed ?? [],
      pendingFollowups: pendingFollowups ?? "",
      issuesSupport: issuesSupport ?? "",
      tomorrowPriority: tomorrowPriority ?? "",
      status: status ?? "draft",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    let reportId;
    if (!existingSnap.empty) {
      reportId = existingSnap.docs[0].id;
      await db44().collection("dailyReports").doc(reportId).update(reportData);
      await logAction(req, "UPDATE", "dailyReport", reportId, `Updated report for ${date}`);
    } else {
      const docRef = await db44().collection("dailyReports").add({
        ...reportData,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      reportId = docRef.id;
      await logAction(req, "CREATE", "dailyReport", reportId, `Created report for ${date}`);
    }
    res.status(201).json({ id: reportId, ...reportData });
  } catch (err) {
    console.error("Failed to save daily report:", err);
    res.status(500).json({ error: "Failed to save daily report" });
  }
});
dailyReportsRouter.post("/daily-reports/:id/submit", requireAuth, async (req, res) => {
  try {
    const doc = await db44().collection("dailyReports").doc(req.params.id).get();
    if (!doc.exists) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    const data = doc.data();
    if (data.organizationId !== req.user.organizationId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    await db44().collection("dailyReports").doc(req.params.id).update({
      status: "submitted",
      submittedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    await logAction(req, "SUBMIT", "dailyReport", req.params.id, `Submitted report for ${data.date}`);
    res.json({ message: "Report submitted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit report" });
  }
});
dailyReportsRouter.delete("/daily-reports/:id", requireAuth, async (req, res) => {
  try {
    const doc = await db44().collection("dailyReports").doc(req.params.id).get();
    if (!doc.exists) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    const data = doc.data();
    if (data.organizationId !== req.user.organizationId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    if (req.user.role !== "owner" && req.user.role !== "admin" && data.userId !== req.user.userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    await db44().collection("dailyReports").doc(req.params.id).delete();
    await logAction(req, "DELETE", "dailyReport", req.params.id, `Deleted report for ${data.date}`);
    res.json({ message: "Report deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete report" });
  }
});
dailyReportsRouter.get("/daily-reports-summary", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { date } = req.query;
    if (!date || typeof date !== "string") {
      res.status(400).json({ error: "date query param required" });
      return;
    }
    const snap = await db44().collection("dailyReports").where("organizationId", "==", orgId).where("date", "==", date).get();
    const reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const userIds = [...new Set(reports.map((r) => r.userId))];
    const userSnaps = await Promise.all(
      userIds.map((uid) => db44().collection("users").doc(uid).get())
    );
    const userMap = /* @__PURE__ */ new Map();
    userSnaps.forEach((s) => {
      if (s.exists) userMap.set(s.id, s.data().name ?? "Unknown");
    });
    const summary = reports.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: userMap.get(r.userId) ?? "Unknown",
      date: r.date,
      callsMade: r.callsMade ?? 0,
      quotationsSent: r.quotationsSent ?? 0,
      meetingsScheduled: r.meetingsScheduled ?? 0,
      ordersReceived: r.ordersReceived ?? 0,
      paymentReminders: r.paymentReminders ?? 0,
      afterSalesFollowup: r.afterSalesFollowup ?? 0,
      status: r.status ?? "draft",
      crmChecklist: r.crmChecklist ?? {},
      ordersClosed: r.ordersClosed ?? [],
      pendingFollowups: r.pendingFollowups ?? "",
      issuesSupport: r.issuesSupport ?? "",
      tomorrowPriority: r.tomorrowPriority ?? ""
    }));
    res.json(summary);
  } catch (err) {
    console.error("Failed to fetch daily reports summary:", err);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});
var daily_reports_default = dailyReportsRouter;

// src/routes/roles.ts
var import_express42 = require("express");
var db45 = () => getDb();
var rolesRouter = (0, import_express42.Router)();
var DEFAULT_ROLES = [
  { key: "owner", name: "Owner", description: "Full access to everything", isSystem: true, isDefault: false },
  { key: "admin", name: "Admin", description: "Manage members and settings", isSystem: true, isDefault: false },
  { key: "sales", name: "Sales", description: "Standard sales access", isSystem: true, isDefault: false },
  { key: "sales_executive", name: "Sales Executive", description: "Sales with daily report duties", isSystem: true, isDefault: true },
  { key: "viewer", name: "Viewer", description: "Read-only access", isSystem: true, isDefault: false }
];
async function ensureDefaultRoles(orgId) {
  const snap = await db45().collection("roles").where("organizationId", "==", orgId).limit(1).get();
  if (snap.empty) {
    const batch = db45().batch();
    for (const r of DEFAULT_ROLES) {
      const ref = db45().collection("roles").doc();
      batch.set(ref, {
        organizationId: orgId,
        key: r.key,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        isDefault: r.isDefault,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    await batch.commit();
  }
}
rolesRouter.get("/roles", requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    await ensureDefaultRoles(orgId);
    const snap = await db45().collection("roles").where("organizationId", "==", orgId).get();
    const roles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    roles.sort((a, b) => {
      if (a.isSystem && !b.isSystem) return -1;
      if (!a.isSystem && b.isSystem) return 1;
      return String(a.name).localeCompare(String(b.name));
    });
    res.json(roles);
  } catch (err) {
    console.error("Failed to fetch roles:", err);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});
rolesRouter.post("/roles", requireAuth, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { name, description, isDefault } = req.body ?? {};
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Role name is required" });
      return;
    }
    const trimmedName = name.trim();
    if (trimmedName.length > 50) {
      res.status(400).json({ error: "Role name must be 50 characters or less" });
      return;
    }
    const key = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
    const existingSnap = await db45().collection("roles").where("organizationId", "==", orgId).where("key", "==", key).limit(1).get();
    if (!existingSnap.empty) {
      res.status(409).json({ error: `A role with the name "${trimmedName}" already exists` });
      return;
    }
    const roleData = {
      organizationId: orgId,
      key,
      name: trimmedName,
      description: description ?? "",
      isSystem: false,
      isDefault: Boolean(isDefault),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const docRef = await db45().collection("roles").add(roleData);
    await logAction(req, "CREATE", "role", docRef.id, `Created role "${trimmedName}"`);
    res.status(201).json({ id: docRef.id, ...roleData });
  } catch (err) {
    console.error("Failed to create role:", err);
    res.status(500).json({ error: "Failed to create role" });
  }
});
rolesRouter.patch("/roles/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { id } = req.params;
    const { name, description, isDefault } = req.body ?? {};
    const doc = await db45().collection("roles").doc(id).get();
    if (!doc.exists) {
      res.status(404).json({ error: "Role not found" });
      return;
    }
    const data = doc.data();
    if (data.organizationId !== orgId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    if (data.isSystem && req.user.role !== "owner") {
      res.status(403).json({ error: "Only the owner can edit system roles" });
      return;
    }
    if (data.key === "owner") {
      res.status(400).json({ error: "Cannot rename the Owner role" });
      return;
    }
    const updates = { updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    if (name !== void 0) {
      const trimmedName = String(name).trim();
      if (trimmedName.length === 0) {
        res.status(400).json({ error: "Role name cannot be empty" });
        return;
      }
      updates.name = trimmedName;
    }
    if (description !== void 0) updates.description = String(description);
    if (isDefault !== void 0) updates.isDefault = Boolean(isDefault);
    await db45().collection("roles").doc(id).update(updates);
    await logAction(req, "UPDATE", "role", id, `Updated role "${data.name}"`);
    const updated = await db45().collection("roles").doc(id).get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error("Failed to update role:", err);
    res.status(500).json({ error: "Failed to update role" });
  }
});
rolesRouter.delete("/roles/:id", requireAuth, requireOwner, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { id } = req.params;
    const doc = await db45().collection("roles").doc(id).get();
    if (!doc.exists) {
      res.status(404).json({ error: "Role not found" });
      return;
    }
    const data = doc.data();
    if (data.organizationId !== orgId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    if (data.isSystem) {
      res.status(400).json({ error: "Cannot delete a system role" });
      return;
    }
    const memberSnap = await db45().collection("organization_members").where("organizationId", "==", orgId).where("role", "==", data.key).limit(1).get();
    if (!memberSnap.empty) {
      res.status(400).json({ error: `Cannot delete "${data.name}" \u2014 ${memberSnap.size} member(s) currently have this role. Reassign them first.` });
      return;
    }
    await db45().collection("roles").doc(id).delete();
    await logAction(req, "DELETE", "role", id, `Deleted role "${data.name}"`);
    res.json({ message: "Role deleted" });
  } catch (err) {
    console.error("Failed to delete role:", err);
    res.status(500).json({ error: "Failed to delete role" });
  }
});
var roles_default = rolesRouter;

// src/routes/index.ts
var router2 = (0, import_express43.Router)();
router2.use(health_default);
router2.use(auth_default);
router2.use(organizations_default);
router2.use(clients_default);
router2.use(products_default);
router2.use(addons_default);
router2.use(quotations_default);
router2.use(reports_default);
router2.use(sms_default);
router2.use(leads_default);
router2.use(tasks_default);
router2.use(calls_default);
router2.use(emails_default);
router2.use(campaigns_default);
router2.use(sales_orders_default);
router2.use(invoices_default);
router2.use(payments_default);
router2.use(integrations_default);
router2.use(dashboard_widgets_default);
router2.use(items_default);
router2.use(warehouses_default);
router2.use(vendors_default);
router2.use(purchase_orders_default);
router2.use(grn_default);
router2.use(vendor_bills_default);
router2.use(inventory_default);
router2.use(social_default);
router2.use(marketing_default);
router2.use(ai_default);
router2.use(reports_r4_default);
router2.use(uploads_default);
router2.use(employees_default);
router2.use(attendance_default);
router2.use(payroll_default);
router2.use(leave_requests_default);
router2.use(expenses_default);
router2.use(accounting_default);
router2.use(push_default);
router2.use(whatsapp_default);
router2.use(lead_sources_default);
router2.use(daily_reports_default);
router2.use(roles_default);
var routes_default = router2;

// src/app.ts
var app2 = (0, import_express44.default)();
app2.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With,Accept,Origin");
  res.header("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
try {
  const pinoHttp = require("pino-http");
  const { logger: logger2 } = (init_logger(), __toCommonJS(logger_exports));
  if (typeof pinoHttp === "function") {
    app2.use(
      pinoHttp({
        logger: logger2,
        serializers: {
          req(req) {
            return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
          },
          res(res) {
            return { statusCode: res.statusCode };
          }
        }
      })
    );
  }
} catch {
}
app2.use(
  import_express44.default.json({
    verify: (req, _res, buf) => {
      req.rawBody = Buffer.from(buf);
    }
  })
);
app2.use(import_express44.default.urlencoded({ extended: true }));
app2.use("/api/uploads", import_express44.default.static(process.env.VERCEL ? "/tmp/uploads" : "uploads", { maxAge: "30d" }));
app2.get("/api/health", (_req, res) => {
  const fbError = getFirebaseInitError();
  res.json({
    status: fbError ? "degraded" : "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    cache: cacheStats(),
    firebase: fbError ? { error: fbError } : { configured: true },
    env: {
      hasProjectId: !!process.env.FIREBASE_PROJECT_ID || !!process.env.GCLOUD_PROJECT,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      hasJwtSecret: !!process.env.JWT_SECRET
    }
  });
});
app2.use("/api", routes_default);
app2.get("/", (req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString(), cache: cacheStats() });
});
app2.all("/api/*path", (req, res) => {
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  res.status(405).json({ error: `Method ${req.method} not allowed on ${req.path}` });
});
app2.use((err, _req, res, _next) => {
  console.error("[unhandled]", err);
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.status(500).json({ error: "Internal server error" });
});
var app_default = app2;

// Vercel @vercel/node compatibility
if (module.exports && module.exports.default && typeof module.exports.default === "function" && module.exports.default.use) {
  module.exports = module.exports.default;
}

//# sourceMappingURL=index.cjs.map
