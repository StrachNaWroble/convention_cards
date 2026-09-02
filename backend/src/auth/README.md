# Auth

Authentication and account security live here.

Players should log in with a verified WBF number and a password of their choice. Passwords must be stored only as secure hashes. The auth layer should not know how WBF lookup works internally; it should depend on the WBF verification service.

Account confirmation should be separate from ordinary session management so the app can support future verification improvements without changing login routes.
