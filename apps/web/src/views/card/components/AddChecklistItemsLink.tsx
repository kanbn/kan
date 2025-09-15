import { HiArrowRightStartOnRectangle } from "react-icons/hi2";


export default function AddChecklistItemsLink({cardPublicId }: {cardPublicId: string }) {


  return (
    <>
      <a
        target="_blank"
        href={`https://lavanderia.costao.com.br/${cardPublicId}`}
        className="flex cursor-pointer h-full w-full items-center rounded-[5px] border-[1px] border-light-50 py-1 pl-2 text-left text-sm text-neutral-900 hover:border-light-300 hover:bg-light-200 dark:border-dark-50 dark:text-dark-1000 dark:hover:border-dark-200 dark:hover:bg-dark-100"
      > 
          <p className="flex">
            <HiArrowRightStartOnRectangle size={14} />
          </p>
          <p className="pl-2">
            Adicionar Item 
          </p>
        </a>
    </>
  );
}
