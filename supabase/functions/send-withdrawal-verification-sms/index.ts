import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
}

interface SMSRequest {
  phone: string
  code: string
  approverName?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const { phone, code, approverName }: SMSRequest = await req.json()

    if (!phone || !code) {
      return new Response(
        JSON.stringify({ error: "Phone number and verification code are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const smsApiKey = Deno.env.get("SMS_API_KEY")
    if (!smsApiKey) {
      console.error("SMS_API_KEY not configured")
      return new Response(
        JSON.stringify({ error: "SMS service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const cleanPhone = phone.replace(/\D/g, '')
    const formattedPhone = cleanPhone.startsWith('256') ? cleanPhone : `256${cleanPhone}`

    const message = approverName
      ? `Hello ${approverName}, your Great Pearl Finance withdrawal approval code is: ${code}. Valid for 5 minutes. Do not share this code.`
      : `Your Great Pearl Finance withdrawal approval code is: ${code}. Valid for 5 minutes. Do not share this code.`

    const smsResponse = await fetch("https://sms.sunshineuganda.com/api/v1/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${smsApiKey}`,
      },
      body: JSON.stringify({
        to: formattedPhone,
        message: message,
        sender_id: "GPCF",
      }),
    })

    const responseData = await smsResponse.json()

    if (!smsResponse.ok) {
      console.error("SMS API error:", responseData)
      return new Response(
        JSON.stringify({
          error: "Failed to send SMS",
          details: responseData
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Verification code sent successfully",
        phone: formattedPhone
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("Error in send-withdrawal-verification-sms:", error)
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
