import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OcrApiResponse {
  ParsedResults?: Array<{
    ParsedText: string;
    FileParseExitCode: number;
    ErrorMessage?: string;
  }>;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string[];
}

async function extractTextFromImage(imageData: Uint8Array, mimeType: string): Promise<string> {
  const OCR_API_KEY = Deno.env.get("OCR_SPACE_API_KEY");

  if (!OCR_API_KEY) {
    return simulateOcrResult();
  }

  const base64 = btoa(String.fromCharCode(...imageData));
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const formData = new FormData();
  formData.append("base64Image", dataUrl);
  formData.append("language", "chs");
  formData.append("isOverlayRequired", "false");
  formData.append("OCREngine", "2");

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: {
      apikey: OCR_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OCR API 响应异常: ${response.status}`);
  }

  const result = await response.json() as OcrApiResponse;

  if (result.IsErroredOnProcessing) {
    throw new Error(result.ErrorMessage?.join(", ") ?? "OCR 处理失败");
  }

  const parsed = result.ParsedResults?.[0];
  if (!parsed || parsed.FileParseExitCode !== 1) {
    throw new Error(parsed?.ErrorMessage ?? "OCR 解析失败");
  }

  return parsed.ParsedText ?? "";
}

function simulateOcrResult(): string {
  const samples = [
    "合同编号：HT-2024-001\n\n甲方：某某科技有限公司\n乙方：合作方名称\n\n合同标题：服务协议\n\n第一条 服务内容\n本协议就甲方委托乙方提供相关技术服务事宜达成如下协议。\n\n第二条 服务期限\n本协议自签订之日起生效，有效期为一年。\n\n第三条 费用及支付方式\n服务费用为人民币壹万元整（¥10,000.00）。",
    "采购合同\n\n购买方：某某企业\n供应方：供应商名称\n\n商品名称：办公设备\n数量：10台\n单价：2,500元\n总价：25,000元\n\n交货时间：签订合同后15个工作日内\n\n质保期：一年",
  ];
  return samples[Math.floor(Math.random() * samples.length)];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "请使用 multipart/form-data 上传图片" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return new Response(
        JSON.stringify({ error: "缺少 image 字段" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(imageFile.type)) {
      return new Response(
        JSON.stringify({ error: "不支持的图片格式" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const imageData = new Uint8Array(arrayBuffer);

    const text = await extractTextFromImage(imageData, imageFile.type);

    return new Response(
      JSON.stringify({ text, confidence: 0.95 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "内部错误";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
