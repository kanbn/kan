import https from "https";

const token = process.env.MSG_ACCESS_TOKEN;
if (!token) throw new Error("MSG_ACCESS_TOKEN is not defined in .env");

interface SmsPayload {
  to: string;
  from: string;
  body: string;
}

export function sendSms(payload: SmsPayload): Promise<string> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);

    const options: https.RequestOptions = {
      hostname: "msg.costao.com.br",
      port: 443,
      path: `/sms?access_token=${token}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
      rejectUnauthorized: false, 
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`Request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}
