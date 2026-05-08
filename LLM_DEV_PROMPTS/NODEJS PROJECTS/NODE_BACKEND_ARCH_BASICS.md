---
title: Node Backend Architectural Basic Principals
last_modified: 2026-03-02
---

1. Separate concerns  into distinct layers. 

2. Adhering to the above pricinciple makes c ode more extensible, testable and maintainable. Group around functionality, adhering to the following structure on the backend:

 a. **Routes/Controllers:** Handle API endpoints and process the request/response cycle. Controllers should be kept lean, delegating business logic to the service layer.

 b. **Services/Business Logic:** Contain the core application logic and domain rules. This layer orchestrates interactions between other components.

 c.  **Models/Data Access:** Interact with the database (using ORMs like Mongoose or Sequelize). Abstract database logic into repositories for reusability.

 d. **Middleware:** Used for cross-cutting concerns such as cors, authentication, logging, and error handling.

3. Modularity: Break code into the smallest reusable modules that make logical sense.  Each discreet class or method should have a single responsibility.

4. Objects should depend on abstractions, not concretions. High-level modules contain the core business logic or application-specific behavior.
Lower-level modules deal with implementation details, such as interacting with a database, file system, or external APIs.

# Author

[@sjDev](https://sjdev.co)
&lt;[sj@sjdev.co](mailto:sj@sjdev.co)&gt;

# License

MIT. See [LICENSE](../LICENSE).
