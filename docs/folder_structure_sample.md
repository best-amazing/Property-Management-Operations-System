# Folder Structure

Here is the complete folder structure of the `src` directory to help you implement your backend:

```text
C:\Users\USER\Work\juyunna\Juyonna-travels-server\src
|   AIES.postman_collection (1).json
|   Api.ts
|   app.ts
|   config.ts
|   routes.ts
|   server.ts
|
+---api
|   +---admin
|   |   |   index.ts
|   |   |
|   |   \---handlers
|   |           ... (various admin handlers)
|   |
|   +---auth
|   |   |   index.ts
|   |   |
|   |   \---handlers
|   |       +---change-password
|   |       |       change-password.v1.ts
|   |       |       index.ts
|   |       |
|   |       +---complete-onboarding
|   |       |       complete-onboarding.v1.ts
|   |       |       index.ts
|   |       |
|   |       +---forgot-password
|   |       |       forgot-password.v1.ts
|   |       |       index.ts
|   |       |
|   |       +---login
|   |       |       index.ts
|   |       |       login.v1.ts
|   |       |
|   |       +---reset-password
|   |       |       index.ts
|   |       |       reset-password.v1.ts
|   |       |
|   |       +---signup
|   |       |       index.ts
|   |       |       signup.v1.ts
|   |       |
|   |       +---verify-otp
|   |       |       index.ts
|   |       |       verify-otp.v1.ts
|   |       |
|   |       \---verify-token
|   |               index.ts
|   |               verify-token.v1.ts
|   |
|   +---helpers
|   |       get-active-and-upcoming-sevices.ts
|   |       get-dashboard-summary.ts
|   |       get-dashboard-summary.v2.ts
|   |       get-protocol-service-summary.ts
|   |
|   +---shipment
|   |   |   index.ts
|   |   |
|   |   \---handlers
|   |           ... (various shipment handlers)
|   |
|   +---travel-insurance
|   |   |   index.ts
|   |   |
|   |   \---handlers
|   |           ... (various travel insurance handlers)
|   |
|   +---user-profile
|   |   |   index.ts
|   |   |
|   |   \---handlers
|   |           ... (various user profile handlers)
|   |
|   \---webhooks
|           index.ts
|           paystack.ts
|
+---events
|       index.ts
|       listener.ts
|
+---exceptions
|       index.ts
|
+---jobs
|       get-airports-jobs.ts
|
+---libs
|   +---aies
|   |       ... (AIES integration files)
|   +---anchor
|   |       ... (Anchor integration files)
|   +---firebase
|   |       ... (Firebase integration files)
|   +---paystack
|   |       ... (Paystack integration files)
|   +---tangerine
|   |       ... (Tangerine integration files)
|   +---termii
|   |       ... (Termii integration files)
|   +---whatsapp
|   |       ... (WhatsApp integration files)
|   \---zeptomail
|           ... (ZeptoMail integration files)
|
+---middlewares
|       checkJwt.ts
|       checkRoles.ts
|       errorHandler.ts
|
+---scripts
|       add-activities-to-all-users.ts
|       ... (other scripts)
|
+---types
|       index.ts
|       paystack.ts
|       travelInsurance.ts
|
\---utils
        cron-manager.ts
        currency.ts
        date.ts
        delivery.ts
        generate-otp.ts
        get-ip-address.ts
        id-generator.ts
        index.ts
        jwt.ts
        logger.ts
        phoneService.ts
        prisma.ts
        swagger.ts
        validations.ts
```

## Structure Overview

*   **api/**: Contains the main API routes and handlers, categorized by feature (`admin`, `auth`, `shipment`, `travel-insurance`, `user-profile`). Handlers are further separated into versions (e.g., `login.v1.ts`).
*   **events/**: Event listeners and publishers.
*   **exceptions/**: Custom error and exception classes.
*   **jobs/**: Background jobs (e.g., `get-airports-jobs.ts`).
*   **libs/**: Third-party integrations (AIES, Anchor, Firebase, Paystack, Tangerine, Termii, WhatsApp, Zeptomail).
*   **middlewares/**: Express middlewares (auth checks, error handling).
*   **scripts/**: Utility scripts for database maintenance, backfilling, and testing.
*   **types/**: TypeScript type definitions and interfaces.
*   **utils/**: Shared utility functions and modules (e.g., date formatting, logger, Prisma client instance, JWT).

This structure follows a domain-driven approach within the `api` folder, where each domain (auth, shipment, etc.) has its own handlers. Third-party integrations are cleanly separated in the `libs` folder.
