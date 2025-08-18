import { Menu, Transition } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { Fragment } from "react";
import { HiMiniPlus } from "react-icons/hi2";

import Avatar from "~/components/Avatar";
import { ANIMATIONS, UI_CONSTANTS } from "~/lib/constants/customFields";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";

interface UserFieldSelectorProps {
  members: {
    id: number;
    publicId: string;
    email: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    } | null;
  }[];
  selectedUserId: number | null;
  onSelect: (userId: number | null) => void;
  placeholder?: string;
}

export default function UserFieldSelector({
  members,
  selectedUserId,
  onSelect,
  placeholder = t`Select member`,
}: UserFieldSelectorProps) {
  const selectedMember = members.find((member) => member.id === selectedUserId);

  return (
    <Menu as="div" className="relative flex w-full text-left">
      <Menu.Button className={UI_CONSTANTS.FIELD_INPUT_BASE}>
        {selectedMember?.user ? (
          <div className="flex items-center space-x-2">
            <Avatar
              size="sm"
              name={selectedMember.user.name ?? ""}
              imageUrl={getAvatarUrl(selectedMember.user.image)}
              email={selectedMember.user.email}
            />
            <span>
              {formatMemberDisplayName(
                selectedMember.user.name ?? "",
                selectedMember.user.email,
              )}
            </span>
          </div>
        ) : (
          <div className="flex items-center">
            <HiMiniPlus size={22} className="pr-2" />
            {placeholder}
          </div>
        )}
      </Menu.Button>

      <Transition
        as={Fragment}
        enter={ANIMATIONS.DROPDOWN_ENTER}
        enterFrom={ANIMATIONS.DROPDOWN_ENTER_FROM}
        enterTo={ANIMATIONS.DROPDOWN_ENTER_TO}
        leave={ANIMATIONS.DROPDOWN_LEAVE}
        leaveFrom={ANIMATIONS.DROPDOWN_LEAVE_FROM}
        leaveTo={ANIMATIONS.DROPDOWN_LEAVE_TO}
      >
        <Menu.Items className="absolute left-0 top-8 z-10 mt-2 w-56 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800">
          <div className="py-1">
            {/* Clear selection option */}
            <Menu.Item>
              {({ active }) => (
                <button
                  type="button"
                  className={`${
                    active ? "bg-gray-100 dark:bg-gray-700" : ""
                  } flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                  onClick={() => onSelect(null)}
                >
                  <span className="text-gray-500">{t`No selection`}</span>
                </button>
              )}
            </Menu.Item>

            {/* Member options */}
            {members.map((member) => (
              <Menu.Item key={member.id}>
                {({ active }) => (
                  <button
                    type="button"
                    className={`${
                      active ? "bg-gray-100 dark:bg-gray-700" : ""
                    } ${
                      selectedUserId === member.id
                        ? "bg-blue-50 dark:bg-blue-900"
                        : ""
                    } flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                    onClick={() => onSelect(member.id)}
                  >
                    {member.user ? (
                      <div className="flex items-center space-x-2">
                        <Avatar
                          size="xs"
                          name={member.user.name ?? ""}
                          imageUrl={getAvatarUrl(member.user.image)}
                          email={member.user.email}
                        />
                        <span>
                          {formatMemberDisplayName(
                            member.user.name ?? "",
                            member.user.email,
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-500">
                        {member.email} (Pending)
                      </span>
                    )}
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
