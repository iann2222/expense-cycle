import * as React from "react";

type ModalHistoryState = { __ecModal: true; id: string };

function isModalHistoryState(s: any): s is ModalHistoryState {
  return !!s && s.__ecModal === true && typeof s.id === "string";
}

function getStack(): string[] {
  const w = window as any;
  if (!Array.isArray(w.__EC_MODAL_STACK)) w.__EC_MODAL_STACK = [];
  return w.__EC_MODAL_STACK as string[];
}

function pushStack(id: string) {
  const stack = getStack();
  stack.push(id);
}

function popStackIfTop(id: string) {
  const stack = getStack();
  if (stack.length && stack[stack.length - 1] === id) stack.pop();
}

function removeFromStack(id: string) {
  const stack = getStack();
  // 從尾端移除第一個符合的（較符合「層級」直覺）
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i] === id) {
      stack.splice(i, 1);
      return;
    }
  }
}

function topIs(id: string) {
  const stack = getStack();
  return stack.length > 0 && stack[stack.length - 1] === id;
}

/**
 * Stack-aware modal back handler:
 * - open=true：push 一層 history + stack push
 * - 返回鍵(popstate)：只有 stack top 的那個 modal 會關閉
 * - open=false（非返回鍵關閉）：若 history.state 是該 modal，會自動 back 收掉那層
 *
 * ⚠️ id 必須對「每個 modal 層」保持穩定且唯一（例如 item-dialog、item-dirty-confirm）
 */
export function useModalBackHandler(
  open: boolean,
  onBackClose: () => void,
  id: string
) {
  const onBackRef = React.useRef(onBackClose);
  React.useEffect(() => {
    onBackRef.current = onBackClose;
  }, [onBackClose]);

  const pushedRef = React.useRef(false);
  const closedByBackRef = React.useRef(false);

  // open 時 push history + stack，並監聽 popstate
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!open) return;

    // push history entry
    window.history.pushState({ __ecModal: true, id } satisfies ModalHistoryState, "", window.location.href);
    // push stack
    pushStack(id);

    pushedRef.current = true;
    closedByBackRef.current = false;

    const handler = () => {
      // 只允許最上層 modal 處理返回鍵
      if (!topIs(id)) return;

      (window as any).__EC_MODAL_HANDLED = true;

      // 先把自己從 stack 彈掉，避免同一次事件裡其他 listener 誤判
      popStackIfTop(id);

      pushedRef.current = false;
      closedByBackRef.current = true;

      onBackRef.current();
    };

    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [open, id]);

  // open=false 後：若是「返回鍵關閉」就不要再 back 一次
  // 若是「按取消/按鈕關閉」則要把 history 那層收掉（並維持 stack 正確）
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (open) return;
    if (!pushedRef.current) {
      // 如果它已經不是 pushed 狀態，仍然確保 stack 不殘留
      removeFromStack(id);
      closedByBackRef.current = false;
      return;
    }

    // 如果是被返回鍵關掉的，popstate 已經發生並且 stack 已 pop
    if (closedByBackRef.current) {
      pushedRef.current = false;
      closedByBackRef.current = false;
      removeFromStack(id); // 保險：避免殘留
      return;
    }

    // 非 back 造成的 close：收掉對應的 history entry
    const st = window.history.state;

    // 只有在「當前 history.state 就是我們這層」時，才 back 一次收掉
    if (isModalHistoryState(st) && st.id === id) {
      (window as any).__EC_MODAL_HANDLED = true;

      // stack 也移除（正常情況它會在 top）
      popStackIfTop(id);
      removeFromStack(id);

      pushedRef.current = false;
      window.history.back();
      return;
    }

    // 若 state 不是它（例如被其他層覆蓋/異常），也要把 stack 清乾淨
    pushedRef.current = false;
    removeFromStack(id);
  }, [open, id]);
}
