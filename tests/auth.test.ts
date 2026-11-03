import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  accessCodeErrorMessage,
  canManageRole,
  roleHome,
  roleLabel,
  safeNextPath,
} from "@/lib/auth.ts";

describe("role helpers", () => {
  it("only the chef mode can edit", () => {
    assert.equal(canManageRole("chef"), true);
    assert.equal(canManageRole("diner"), false);
    assert.equal(canManageRole(null), false);
  });

  it("lands the chef on orders and the diner on the menu", () => {
    assert.equal(roleHome("chef"), "/chef/orders");
    assert.equal(roleHome("diner"), "/menu");
    assert.equal(roleHome(null), "/menu");
  });

  it("labels both roles and the guest fallback", () => {
    assert.equal(roleLabel("diner"), "点餐员");
    assert.equal(roleLabel("chef"), "大厨");
    assert.equal(roleLabel(null), "访客");
  });
});

describe("safeNextPath", () => {
  it("keeps local paths", () => {
    assert.equal(safeNextPath("/menu"), "/menu");
    assert.equal(safeNextPath("/import?title=abc"), "/import?title=abc");
  });

  it("rejects external and protocol-relative redirects", () => {
    assert.equal(safeNextPath("https://evil.example"), null);
    assert.equal(safeNextPath("//evil.example"), null);
    assert.equal(safeNextPath("/\\evil.example"), null);
    assert.equal(safeNextPath("menu"), null);
    assert.equal(safeNextPath(null), null);
  });
});

describe("accessCodeErrorMessage", () => {
  it("explains the anonymous sign-in prerequisite", () => {
    assert.match(
      accessCodeErrorMessage(
        new Error("Anonymous sign-ins are disabled"),
      ),
      /Anonymous sign-ins/,
    );
  });

  it("points at the schema when the access-code function is missing", () => {
    assert.match(
      accessCodeErrorMessage(
        new Error("Could not find the function public.redeem_kitchen_code"),
      ),
      /schema\.sql/,
    );
  });

  it("keeps an unknown message as a last resort", () => {
    assert.equal(accessCodeErrorMessage(new Error("boom")), "boom");
  });
});
