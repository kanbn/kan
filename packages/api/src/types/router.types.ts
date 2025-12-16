import type { RouterInputs, RouterOutputs } from "../index";

export type GetBoardByIdOutput = RouterOutputs["board"]["byId"];
export type GetCardByIdOutput = RouterOutputs["card"]["byId"];
export type GetCardActivitiesOutput = RouterOutputs["card"]["getActivities"];
export type UpdateBoardInput = RouterInputs["board"]["update"];
export type NewLabelInput = RouterInputs["label"]["create"];
export type NewListInput = RouterInputs["list"]["create"];
export type NewCardInput = RouterInputs["card"]["create"];
export type NewBoardInput = RouterInputs["board"]["create"];
export type InviteMemberInput = RouterInputs["member"]["invite"];
