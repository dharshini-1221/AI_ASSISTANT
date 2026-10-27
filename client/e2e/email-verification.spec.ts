import { test, expect } from "@playwright/test";

test("register page renders form", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: /get started/i })).toBeVisible();
  await expect(page.getByLabel(/full name/i)).toBeVisible();
  await expect(page.getByLabel(/email address/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
});

test("verify-email shows OTP form", async ({ page }) => {
  await page.goto("/verify-email");
  await expect(page.getByRole("heading", { name: /verify your email/i })).toBeVisible({ timeout: 15000 });
  await expect(page.locator("input[type=email]")).toBeVisible();
  await expect(page.locator("input[pattern]").first()).toBeVisible();
});

test("verify-email with invalid token shows failure", async ({ page }) => {
  await page.goto("/verify-email?token=invalidtoken123");
  await expect(page.getByRole("heading", { name: /verification failed/i })).toBeVisible({ timeout: 15000 });
});

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/login/);
});
