import { Logestic } from "logestic";

// Production failures log the path and code only: Elysia's validation messages embed the
// submitted body (passwords included) and full URLs can carry tokens.
const plain = () =>
  new Logestic().use(["time", "method", "path", "status", "duration"]).format({
    onSuccess: ({ time, method, path, status, duration }) =>
      `${time.toISOString()} ${method} ${path} ${status} ${duration}μs`,
    onFailure: ({ request, code, datetime }) =>
      `${datetime.toISOString()} ${request.method} ${new URL(request.url).pathname} ${code}`,
  });

export default process.env.NODE_ENV === "production" ? plain() : Logestic.preset("fancy");
