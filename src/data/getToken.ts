import "server-only";
import { KJUR } from "jsrsasign";

// Track whether this session has been assigned a host - this facilitates the permissions for host vs other users
let hasHost = false; 

// TODO should reset hasHost when host leaves or session ends >> this will only reset now when server resets (i think)

export async function getData(slug: string) {
  // Assign roletype - 1 is for host, 0 for other users
  const role = hasHost ? 0 : 1;
  if (!hasHost) hasHost = true;

  const JWT = await generateSignature(slug, role);
  return {JWT, role};
}

// Note - currently I am testing locally so "users" will just be me accessing the video call from different browser tabs

function generateSignature(sessionName: string, role: number) {
  if (!process.env.ZOOM_SDK_KEY || !process.env.ZOOM_SDK_SECRET) {
    throw new Error("Missing ZOOM_SDK_KEY or ZOOM_SDK_SECRET");
  }
  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;
  const oHeader = { alg: "HS256", typ: "JWT" };
  const sdkKey = process.env.ZOOM_SDK_KEY;
  const sdkSecret = process.env.ZOOM_SDK_SECRET;
  const oPayload = {
    app_key: sdkKey, tpc: sessionName, role_type: role, version: 1, iat: iat, exp: exp,
  };

  const sHeader = JSON.stringify(oHeader);
  const sPayload = JSON.stringify(oPayload);
  const sdkJWT = KJUR.jws.JWS.sign("HS256", sHeader, sPayload, sdkSecret);
  return sdkJWT;
}
