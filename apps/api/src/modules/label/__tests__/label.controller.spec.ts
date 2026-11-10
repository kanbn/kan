import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LabelController } from "../label.controller.js";
import { LabelService } from "../label.service.js";

const mockLabelService = {
  byPublicId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
const user = { id: "user_1", email: "henry@kan.bn" };

let controller: LabelController;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    controllers: [LabelController],
    providers: [{ provide: LabelService, useValue: mockLabelService }],
  }).compile();

  controller = module.get(LabelController);
});

describe("LabelController", () => {
  it("passes the current user's id and path param through to byPublicId", async () => {
    mockLabelService.byPublicId.mockResolvedValue({
      publicId: "label_12345",
      name: "Bug",
      colourCode: "#ff0000",
    });

    const result = await controller.byPublicId(user as never, "label_12345");

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

  it("passes the current user's id and body through to create", async () => {
    mockLabelService.create.mockResolvedValue({
      publicId: "label_12345",
      name: "Bug",
      colourCode: "#ff0000",
    });

    const result = await controller.create(user as never, {
      name: "Bug",
      boardPublicId: "board_12345",
      colourCode: "#ff0000",
    } as never);

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

  it("passes the current user's id, path param and body through to update", async () => {
    mockLabelService.update.mockResolvedValue({
      publicId: "label_12345",
      name: "Feature",
      colourCode: "#00ff00",
    });

    const result = await controller.update(user as never, "label_12345", {
      name: "Feature",
      colourCode: "#00ff00",
    } as never);

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

  it("passes the current user's id and path param through to delete", async () => {
    mockLabelService.delete.mockResolvedValue({ success: true });

    const result = await controller.delete(user as never, "label_12345");

    expect(result).toEqual({ success: true });
    expect(mockLabelService.delete).toHaveBeenCalledWith({
      labelPublicId: "label_12345",
      userId: "user_1",
    });
  });
});
