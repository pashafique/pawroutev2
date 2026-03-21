import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; role: string };
    user: { id: string; role: string };
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    admin?: { id: string; email: string; role: string };
  }
}
