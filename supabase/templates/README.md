# E-mails do login (Supabase Auth)

Modelos em português dos e-mails que o Supabase envia. O assunto de cada um fica em `subjects.json`.

| Arquivo | Modelo no painel |
| --- | --- |
| `confirmation.html` | Confirme a inscrição |
| `invite.html` | Convidar usuário |
| `magic_link.html` | Link mágico ou OTP |
| `email_change.html` | Alterar endereço de e-mail |
| `recovery.html` | Redefinir senha |
| `reauthentication.html` | Reautenticação |

Aplicados no projeto pela Management API (`PATCH /v1/projects/{ref}/config/auth`, campos `mailer_subjects_<modelo>` e `mailer_templates_<modelo>_content`). Ao mudar um arquivo, aplicar de novo.

O logo vem de `https://troco-finance.vercel.app/favicon_io/apple-touch-icon.png`. Cores fixas em hexadecimal (zinc), porque e-mail não lê as variáveis do app.
