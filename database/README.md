# Database

PostgreSQL initialization scripts live in `init/`.

The scripts now bootstrap the foundation schemas plus the current relational tables for:

- authentication and users
- customers and purchased policies
- carriers and policy catalog
- claim foundation entities (`claims`, `claim_documents`, `extracted_claim_data`)

New schema changes should be added as ordered SQL scripts inside `init/` so fresh environments keep a reproducible initialization history.
