import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData } from "@remix-run/react";
import { Coffee, UserPlus, LogIn } from "lucide-react";
import { auth } from "~/lib/auth.server";

export const meta: MetaFunction = () => [
  { title: "Register - Coffee Tracker" },
];

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name = String(formData.get("name"));
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  try {
    const result = await auth.api.signUpEmail({
      body: { name, email, password },
      headers: request.headers,
      asResponse: true,
    });

    if (result.ok) {
      const headers = new Headers();
      for (const cookie of result.headers.getSetCookie()) headers.append("Set-Cookie", cookie);
      return redirect("/", { headers });
    }
  } catch (err) {
    return json({ error: "Registration failed. Email may already exist." }, { status: 400 });
  }

  return json({ error: "Registration failed" }, { status: 400 });
}

export default function Register() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen flex items-center justify-center bg-coffee-100 px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-coffee-200 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-coffee-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Coffee className="w-8 h-8 text-espresso-600" />
          </div>
          <h1 className="text-2xl font-bold text-coffee-900 font-display">Coffee Tracker</h1>
          <p className="text-coffee-500 mt-1">Create your account</p>
        </div>

        <Form method="post" className="space-y-4">
          {actionData?.error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {actionData.error}
            </div>
          )}

          <div>
            <label className="form-label">Name</label>
            <input type="text" name="name" required className="form-input" placeholder="Your name" />
          </div>

          <div>
            <label className="form-label">Email</label>
            <input type="email" name="email" required className="form-input" placeholder="you@example.com" />
          </div>

          <div>
            <label className="form-label">Password</label>
            <input type="password" name="password" required minLength={8} className="form-input" placeholder="Min 8 characters" />
          </div>

          <button type="submit" className="btn-primary w-full">
            <UserPlus className="w-4 h-4 mr-2" /> Create Account
          </button>
        </Form>

        <div className="mt-6 text-center">
          <p className="text-coffee-500 text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-espresso-600 hover:text-espresso-700 font-medium">
              <LogIn className="w-3.5 h-3.5 inline mr-0.5" /> Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
