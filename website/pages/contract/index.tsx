import BigNumber from "bignumber.js";
import { Pagination } from "../../components/pagination";
import React, { useState, useEffect, useReducer } from "react";
import {
  getCurrentBlock,
  Contract,
  getContract,
  EventListener,
  getEventListenerList,
  deleteEventListener,
  createEventListener,
  updateEventListener,
  getEventListenerCount,
} from "../../api";
import { Modal } from "../../components/modal";

interface EventListenerState {
  id?: string;
  name: string;
  syncHeight: number;
}

type EventListenerAction =
  | { type: "setName"; value: string }
  | { type: "setSyncHeight"; value: number };

function EventListenerForm(props: {
  contract: Contract;
  state: EventListenerState;
  error: string;
  onSave: (eventListenerState: EventListenerState) => any;
}) {
  const events = props.contract.abi
    .filter(({ type }) => type === "event")
    .map(({ name }) => name);
  const [eventListenerState, eventListenerDispatcher] = useReducer(
    (state: EventListenerState, action: EventListenerAction) => {
      switch (action.type) {
        case "setName":
          return { ...state, name: action.value };
        case "setSyncHeight":
          return { ...state, syncHeight: action.value };
        default:
          return state;
      }
    },
    props.state
  );

  return (
    <form action="#">
      <fieldset>
        <label htmlFor="listener-name">Name</label>
        <select
          id="listener-name"
          value={eventListenerState.name}
          onChange={(e) =>
            eventListenerDispatcher({
              type: "setName",
              value: e.target.value,
            })
          }
        >
          {events.map((event) => (
            <option key={event} value={event}>
              {event}
            </option>
          ))}
        </select>
        <label htmlFor="contract-height">Sync height</label>
        <input
          id="contract-sync"
          type="text"
          placeholder="Sync height..."
          value={eventListenerState.syncHeight}
          onChange={(e) =>
            eventListenerDispatcher({
              type: "setSyncHeight",
              value: parseInt(e.target.value, 10),
            })
          }
        />
        <div style={{ color: "red" }}>{props.error}</div>
        <button onClick={() => props.onSave(eventListenerState)}>Save</button>
      </fieldset>
    </form>
  );
}

function EventListenerComponent({
  contract,
  eventListener,
  currentBlock,
  onUpdate,
  onDelete,
}: {
  contract: Contract;
  eventListener: EventListener;
  currentBlock: number;
  onUpdate: (listener: EventListener) => any;
  onDelete: (listener: EventListener) => any;
}) {
  const progress =
    currentBlock === 0
      ? 0
      : new BigNumber(eventListener.syncHeight)
          .minus(contract.startHeight)
          .div(new BigNumber(currentBlock).minus(contract.startHeight))
          .multipliedBy(100)
          .toFixed(0);

  return (
    <tr>
      <td>
        <a href={`/contract/${contract.id}/event-listener/${eventListener.id}`}>
          {eventListener.name}
        </a>
      </td>
      <td>
        <div className="progress">
          <span
            className={
              currentBlock === eventListener.syncHeight ? "green" : "red"
            }
            style={{
              width: `${progress}%`,
            }}
          ></span>
        </div>
        <div style={{ textAlign: "center" }}>
          {eventListener.syncHeight}/{currentBlock}
        </div>
      </td>
      <td>
        <div>
          <button className="button" onClick={() => onUpdate(eventListener)}>
            Update
          </button>
          <button
            className="button button-outline"
            onClick={() => onDelete(eventListener)}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export interface Props {
  contractId: string;
}

export function ContractPage({ contractId }: Props) {
  const [name, setName] = useState<string>("0");
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [contract, setContract] = useState<Contract | Error | null>(null);
  const eventListenersLimit = 10;
  const [eventListenersPage, setEventListenersPage] = useState<number>(1);
  const [eventListeners, setEventListeners] = useState<EventListener[]>([]);
  const [eventListenersCount, setEventListenersCount] = useState<number>(0);
  const [eventListenerForm, setEventListenerForm] =
    useState<EventListenerState | null>(null);
  const [addModalError, setAddModalError] = useState<string>("");

  const onReloadEventListenerList = () => {
    const filter = {
      name: name !== "0" ? name : undefined,
    };
    getEventListenerList(
      contractId,
      filter,
      eventListenersLimit,
      (eventListenersPage - 1) * eventListenersLimit
    ).then(setEventListeners);
    getEventListenerCount(contractId, filter).then(setEventListenersCount);
  };

  const onDelete = async (eventListener: EventListener) => {
    if (contract === null || contract instanceof Error) return;
    if (!confirm("Are you sure?")) return;

    await deleteEventListener(contract.id, eventListener.id);
    onReloadEventListenerList();
  };

  const onSave = async (state: EventListenerState) => {
    if (contract === null || contract instanceof Error) return;

    setAddModalError("");
    try {
      if (state.id !== undefined) {
        await updateEventListener(
          contract.id,
          state.id,
          state.name,
          state.syncHeight
        );
      } else {
        await createEventListener(contract.id, state.name, state.syncHeight);
      }
      setEventListenerForm(null);
      onReloadEventListenerList();
    } catch (e) {
      setAddModalError(e.response.data);
    }
  };

  useEffect(() => {
    getContract(contractId)
      .then((contract) => {
        setContract(contract);
        getCurrentBlock(contract.network)
          .then(({ currentBlock }) => setCurrentBlock(currentBlock))
          .catch(() => console.error("Network not supported"));
        onReloadEventListenerList();
      })
      .catch(() => setContract(new Error("Contract not found")));
  }, []);

  useEffect(() => {
    if (contract === null || contract instanceof Error) return;

    onReloadEventListenerList();
  }, [eventListenersPage, name]);

  if (contract === null) {
    return <div className="container">Loading...</div>;
  }
  if (contract instanceof Error) {
    return <div className="container">{contract.message}</div>;
  }

  const eventNames = contract.abi
    .filter(({ type }) => type === "event")
    .map(({ name }) => name);

  return (
    <div className="container">
      <div>
        <a href="/">Main</a>
      </div>
      <div>
        <h3>Listeners:</h3>
        <div className="row">
          <div className="column">
            <select onChange={(e) => setName(e.target.value)} value={name}>
              <option value="">All</option>
              {eventNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Sync progress</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {eventListeners.map((eventListener) => (
              <EventListenerComponent
                eventListener={eventListener}
                contract={contract}
                currentBlock={currentBlock}
                key={eventListener.id}
                onUpdate={(eventListener) =>
                  setEventListenerForm(eventListener)
                }
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
        <Pagination
          count={eventListenersCount}
          limit={eventListenersLimit}
          page={eventListenersPage}
          onPrev={setEventListenersPage}
          onNext={setEventListenersPage}
        />
        <div>
          <button
            onClick={() =>
              setEventListenerForm({
                name: (
                  contract.abi.find(({ type }) => type === "event") ?? {
                    name: "",
                  }
                ).name,
                syncHeight: contract.startHeight,
              })
            }
          >
            Add
          </button>
        </div>
      </div>
      {!contract || (
        <Modal
          header={<h3>Add event listener</h3>}
          isVisible={eventListenerForm !== null}
          onClose={() => setEventListenerForm(null)}
        >
          {eventListenerForm === null || (
            <EventListenerForm
              contract={contract}
              state={eventListenerForm}
              onSave={onSave}
              error={addModalError}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
