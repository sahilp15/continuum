import {
  demoOrganizations,
  demoProjects,
  demoSpaces,
  demoUsers,
  fizzpopMemories,
  northbankMemories,
} from "@continuum/testing";
import type { EvalFixture } from "./runner.js";

const northbankIds = Object.values(northbankMemories).map((m) => m.id);
const fizzpopIds = Object.values(fizzpopMemories).map((m) => m.id);

export const coreEvalFixtures: EvalFixture[] = [
  {
    name: "northbank-march-newsletter",
    actorUserId: demoUsers.freelancer.id,
    request: {
      organizationId: demoOrganizations.studio.id,
      spaceId: demoSpaces.northbank.id,
      projectId: demoProjects.marchNewsletter.id,
      requestingIntegration: "mcp",
      taskDescription: "Write the March newsletter for Northbank about investing",
    },
    expectIncludedMemoryIds: [
      northbankMemories.noJokes!.id,
      northbankMemories.noGuarantees!.id,
      northbankMemories.currentDeadline!.id,
      northbankMemories.audience!.id,
    ],
    expectExcludedMemoryIds: [
      northbankMemories.oldDeadline!.id,
      northbankMemories.rejectedMemes!.id,
      northbankMemories.expiredPromo!.id,
    ],
    forbiddenMemoryIds: fizzpopIds,
    expectRuleTexts: ["jokes", "guarantee financial returns", "Northbank Flex"],
  },
  {
    name: "fizzpop-instagram-caption",
    actorUserId: demoUsers.freelancer.id,
    request: {
      organizationId: demoOrganizations.studio.id,
      spaceId: demoSpaces.fizzpop.id,
      projectId: demoProjects.springCampaign.id,
      requestingIntegration: "browser_extension",
      taskDescription: "Write an Instagram caption for the Cherry Blast launch",
    },
    expectIncludedMemoryIds: [fizzpopMemories.voice!.id, fizzpopMemories.emojis!.id],
    expectExcludedMemoryIds: [],
    forbiddenMemoryIds: northbankIds,
    expectRuleTexts: ["Emojis are allowed"],
  },
];
