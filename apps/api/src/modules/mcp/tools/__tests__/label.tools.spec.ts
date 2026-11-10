import type { TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LabelService } from "../../../label/label.service.js";
import { LabelTools } from "../label.tools.js";

const mockLabelService = {
  byPublicId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
const user = { id: "user_1", email: "henry@kan.bn" };

let tools: LabelTools;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      LabelTools,
      { provide: LabelService, useValue: mockLabelService },
    ],
  }).compile();

  tools = module.get(LabelTools);
});

describe("LabelTools", () => {
  it("passes the authenticated MCP user's id and args through to getLabel", async () => {
    mockLabelService.byPublicId.mockResolvedValue({
      publicId: "label_12345",
      name: "Bug",
      colourCode: "#ff0000",
    });

    const result = await tools.getLabel(
      { labelPublicId: "label_12345" },
      undefined,
      { user },
    );

    expect(result).toEqual({
      publicId: "label_12345",
      name: "Bug",
      colourCode: "#ff0000",
    });
    expect(mockLabelService.byPublicId).toHaveBeenCalledWith({
      labelPublicId: "label_12345",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and args through to createLabel", async () => {
    mockLabelService.create.mockResolvedValue({
      publicId: "label_12345",
      name: "Bug",
      colourCode: "#ff0000",
    });

    const result = await tools.createLabel(
      { name: "Bug", boardPublicId: "board_12345", colourCode: "#ff0000" },
      undefined,
      { user },
    );

    expect(result).toEqual({
      publicId: "label_12345",
      name: "Bug",
      colourCode: "#ff0000",
    });
    expect(mockLabelService.create).toHaveBeenCalledWith({
      name: "Bug",
      boardPublicId: "board_12345",
      colourCode: "#ff0000",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and args through to updateLabel", async () => {
    mockLabelService.update.mockResolvedValue({
      publicId: "label_12345",
      name: "Feature",
      colourCode: "#00ff00",
    });

    const result = await tools.updateLabel(
      {
        labelPublicId: "label_12345",
        name: "Feature",
        colourCode: "#00ff00",
      },
      undefined,
      { user },
    );

    expect(result).toEqual({
      publicId: "label_12345",
      name: "Feature",
      colourCode: "#00ff00",
    });
    expect(mockLabelService.update).toHaveBeenCalledWith({
      labelPublicId: "label_12345",
      name: "Feature",
      colourCode: "#00ff00",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and args through to deleteLabel", async () => {
    mockLabelService.delete.mockResolvedValue({ success: true });

    const result = await tools.deleteLabel(
      { labelPublicId: "label_12345" },
      undefined,
      { user },
    );

    expect(result).toEqual({ success: true });
    expect(mockLabelService.delete).toHaveBeenCalledWith({
      labelPublicId: "label_12345",
      userId: "user_1",
    });
  });

  it("rejects when the MCP request has no authenticated user", async () => {
    await expect(
      tools.getLabel({ labelPublicId: "label_12345" }, undefined, undefined),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockLabelService.byPublicId).not.toHaveBeenCalled();
  });
});
