import type { RawBodyRequest } from "@nestjs/common";
import type { Request, Response } from "express";
import { All, Controller, Req, Res } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { auth, headersFromRaw } from "../../common/session.util.js";

// Nest has already parsed the body, so better-auth gets a fetch Request built
// from the raw bytes instead of its Node handler.
@ApiExcludeController()
@Controller("api/auth")
export class AuthController {
  @All("*path")
  async handle(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const response = await auth.handler(
      new Request(new URL(req.originalUrl, `http://${req.headers.host}`), {
        method: req.method,
        headers: headersFromRaw(req.headers),
        body: hasBody ? req.rawBody : undefined,
      }),
    );

    res.status(response.status);
    response.headers.forEach((value, name) => {
      if (name !== "set-cookie") res.setHeader(name, value);
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader("set-cookie", cookies);
    res.send(Buffer.from(await response.arrayBuffer()));
  }
}
