import { randomUUID } from 'crypto';
import { appendFileSync } from 'fs';
import type { FastifyPluginCallback } from 'fastify';

import fp from 'fastify-plugin';
import { FastifyReply } from 'fastify/types/reply';
import { FastifyRequest } from 'fastify/types/request';

let REQUEST_BUFFER: unknown[] = [];
let RESPONSE_BUFFER: unknown[] = [];

/**
 * Plugin for capturing requests and responses to allow shadow testing.
 *
 * @param fastify The Fastify instance.
 * @param _options Options passed to the plugin via `fastify.register(plugin, options)`.
 * @param done Callback to signal that the logic has completed.
 */
const shadowCapture: FastifyPluginCallback = (fastify, _options, done) => {
  fastify.addHook('onRequest', (req, rep, done) => {
    // Attach timestamp at beginning of lifecycle
    // @ts-expect-error TODO
    req.__timestamp = Date.now();

    // Give request and response same id to match.
    const id = randomUUID();
    // @ts-expect-error TODO
    req.__id = id;
    // @ts-expect-error TODO
    rep.__id = id;
    done();
  });

  // Body is only included after `Parsing` lifecycle
  fastify.addHook('preValidation', (req, rep, done) => {
    captureRequest(req);
    done();
  });

  fastify.addHook('onResponse', (req, rep, done) => {
    captureReply(rep);
    done();
  });

  done();
};

/* eslint-disable @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-return */
function captureRequest(req: FastifyRequest) {
  const savedRequest = {
    // @ts-expect-error TODO
    id: req.__id,
    // @ts-expect-error TODO
    timestamp: req.__timestamp,
    url: req.url,
    headers: omit(req.headers, 'cookie'),
    cookies: include(req.cookies, '_csrf', 'csrf_token', 'jwt_access_token'),
    user: req.user,
    body: req.body
  };

  if (REQUEST_BUFFER.length > 10) {
    appendFileSync(
      'request-capture.jsonl',
      REQUEST_BUFFER.map(rb => JSON.stringify(rb)).join('\n') + '\n'
    );
    REQUEST_BUFFER = [savedRequest];
  } else {
    REQUEST_BUFFER.push(savedRequest);
  }
}

function captureReply(rep: FastifyReply) {
  const savedReply = {
    // @ts-expect-error TODO
    id: rep.__id,
    // @ts-expect-error TODO
    headers: rep.raw._header,
    // @ts-expect-error TODO
    contentLength: rep.raw._contentLength,
    timestamp: Date.now()
  };

  if (RESPONSE_BUFFER.length > 10) {
    appendFileSync(
      'response-capture.jsonl',
      RESPONSE_BUFFER.map(rb => JSON.stringify(rb)).join('\n') + '\n'
    );
    RESPONSE_BUFFER = [savedReply];
  } else {
    RESPONSE_BUFFER.push(savedReply);
  }
}

/**
 * Returns a subset of the given object with the values or properties given removed.
 * @param obj - An array or an object literal.
 * @param vals - Items or properties to exclude from `obj`.
 * @returns Subset of `obj`.
 */
function omit(obj: object, ...vals: unknown[]) {
  if (Array.isArray(obj)) {
    return obj.filter(o => !vals.includes(o));
  } else {
    return (
      Object.keys(obj)
        .filter(k => {
          return !vals.includes(k);
        })
        // @ts-expect-error TODO
        .reduce((acc, curr) => ({ ...acc, [curr]: obj[curr] }), {})
    );
  }
}

function include(obj: object, ...vals: unknown[]) {
  if (Array.isArray(obj)) {
    return obj.filter(o => vals.includes(o));
  } else {
    return (
      Object.keys(obj)
        .filter(k => {
          return vals.includes(k);
        })
        // @ts-expect-error TODO
        .reduce((acc, curr) => ({ ...acc, [curr]: obj[curr] }), {})
    );
  }
}

export default fp(shadowCapture);
