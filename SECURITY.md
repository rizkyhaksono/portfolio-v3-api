# Security

## Reporting a vulnerability

Report security issues privately to the repository owner, or open a [private GitHub security advisory](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/report-a-vulnerability-privately). Do not open a public issue. Do not include secrets, session tokens, passwords, or production data in the report.

## Supported versions

Security fixes land on the current `main` branch.

## Runtime and deployment

- Run **Bun 1.4.4 or newer**. Older 1.2.x and 1.3.x releases are affected by high-severity advisories fixed in 1.4.4.
- In production, set `INTERNAL_PROXY_SECRET` to a long random value shared with the frontend server. The process refuses to start when it is missing or blank, and `POST /v3/auth/oauth/exchange` rejects requests that do not send a matching `x-internal-key`.
- Do not publish port 3121 on a public interface. Reach the API on the internal Docker network.
- Set `TRUSTED_PROXY_CIDRS` to the reverse proxy's own subnet. When it is unset or blank, client-IP headers are ignored. Do not list `10.0.0.0/8`: Swarm ingress uses private addresses for public clients.
- Keep `.env` files out of git. Copy `.env.example` and fill in real values locally or in the secret store.
