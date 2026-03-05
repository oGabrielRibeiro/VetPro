import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import GlobalStatusBar from "./GlobalStatusBar";

describe("GlobalStatusBar", () => {
  const renderComponent = (element) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    flushSync(() => {
      root.render(element);
    });
    return { container, root };
  };

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("nao renderiza quando status idle sem mensagem", () => {
    const { container, root } = renderComponent(
      <GlobalStatusBar status="idle" message="" />,
    );
    root.unmount();
    expect(container.firstChild).toBeNull();
  });

  it("renderiza mensagem de offline corretamente", () => {
    const { container, root } = renderComponent(
      <GlobalStatusBar
        status="offline"
        message="Modo offline ativo. Dados serao sincronizados."
      />,
    );
    const statusNode = container.querySelector('[role="status"]');
    expect(statusNode).toBeTruthy();
    expect(statusNode.textContent).toMatch(/Offline/i);
    expect(statusNode.textContent).toMatch(/Modo offline ativo/i);
    root.unmount();
  });
});
