const { describe, it } = require('node:test');
const assert = require('node:assert');
const { authorize, isAdmin, isFinalYear, protect } = require('../backend/middleware/auth');

describe('Auth Middleware Unit Tests', () => {
    describe('isAdmin', () => {
        it('should call next() if user is admin', () => {
            const req = { user: { role: 'admin' } };
            let nextCalled = false;
            const res = {};
            const next = () => { nextCalled = true; };

            isAdmin(req, res, next);
            assert.strictEqual(nextCalled, true);
        });

        it('should return 403 if user is not admin', () => {
            const req = { user: { role: 'junior' } };
            let status = null;
            let jsonResponse = null;
            const res = {
                status: (code) => {
                    status = code;
                    return {
                        json: (data) => { jsonResponse = data; }
                    };
                }
            };
            const next = () => {};

            isAdmin(req, res, next);
            assert.strictEqual(status, 403);
            assert.strictEqual(jsonResponse.success, false);
        });
    });

    describe('isFinalYear', () => {
        it('should call next() for finalyear role', () => {
            const req = { user: { role: 'finalyear', year: 'TY' } };
            let nextCalled = false;
            const next = () => { nextCalled = true; };

            isFinalYear(req, {}, next);
            assert.strictEqual(nextCalled, true);
        });

        it('should call next() for admin role', () => {
            const req = { user: { role: 'admin', year: 'FY' } };
            let nextCalled = false;
            const next = () => { nextCalled = true; };

            isFinalYear(req, {}, next);
            assert.strictEqual(nextCalled, true);
        });

        it('should call next() if year is Final Year', () => {
            const req = { user: { role: 'junior', year: 'Final Year' } };
            let nextCalled = false;
            const next = () => { nextCalled = true; };

            isFinalYear(req, {}, next);
            assert.strictEqual(nextCalled, true);
        });

        it('should return 403 if user is not final year or admin', () => {
            const req = { user: { role: 'junior', year: 'SY' } };
            let status = null;
            const res = {
                status: (code) => {
                    status = code;
                    return { json: () => {} };
                }
            };

            isFinalYear(req, res, () => {});
            assert.strictEqual(status, 403);
        });
    });

    describe('authorize', () => {
        it('should allow user with authorized role', () => {
            const req = { user: { role: 'admin' } };
            let nextCalled = false;
            const middleware = authorize('admin', 'finalyear');

            middleware(req, {}, () => { nextCalled = true; });
            assert.strictEqual(nextCalled, true);
        });

        it('should reject user with unauthorized role', () => {
            const req = { user: { role: 'junior' } };
            let status = null;
            const res = {
                status: (code) => {
                    status = code;
                    return { json: () => {} };
                }
            };
            const middleware = authorize('admin');

            middleware(req, res, () => {});
            assert.strictEqual(status, 403);
        });
    });

    describe('protect', () => {
        it('should return 401 when no authorization header is present', async () => {
            const req = { headers: {} };
            let status = null;
            const res = {
                status: (code) => {
                    status = code;
                    return { json: () => {} };
                }
            };

            await protect(req, res, () => {});
            assert.strictEqual(status, 401);
        });
    });
});
