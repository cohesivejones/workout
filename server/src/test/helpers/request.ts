import request, { Test } from 'supertest';
import { Application } from 'express';

/**
 * Creates a supertest request with authentication cookie pre-configured
 * @param app - Express application
 * @param authToken - JWT authentication token
 * @returns Object with HTTP method helpers
 */
export function authenticatedRequest(app: Application, authToken: string) {
  return {
    get: (url: string): Test => {
      return request(app)
        .get(url)
        .set('Cookie', [`token=${authToken}`]);
    },
    post: (url: string): Test => {
      return request(app)
        .post(url)
        .set('Cookie', [`token=${authToken}`]);
    },
    put: (url: string): Test => {
      return request(app)
        .put(url)
        .set('Cookie', [`token=${authToken}`]);
    },
    delete: (url: string): Test => {
      return request(app)
        .delete(url)
        .set('Cookie', [`token=${authToken}`]);
    },
    patch: (url: string): Test => {
      return request(app)
        .patch(url)
        .set('Cookie', [`token=${authToken}`]);
    },
  };
}
