import React, {
  useEffect,
  useState,
  useRef,
  useLayoutEffect,
  useCallback
} from "react";
import { createPortal } from "react-dom";

import "../src/styles.css";

function App() {
  const [input, setInput] = useState("");
  const [notes, setNotes] = useState([]);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [modalState, setModalState] = useState({
    isOpen: false,
    isDragging: false,
    isError: false,
    position: { x: window.innerWidth / 3, y: window.innerHeight / 3 },
    selectedNote: null
  });

  const modalRef = useRef();
  const modalRootRef = useRef(document.createElement("div"));
  const modalContentRef = useRef();

  const errorDelay = 3000;

  const calculateModalPosition = useCallback(() => {
    const modalElement = modalContentRef.current;

    if (modalElement) {
      const modalRect = modalElement.getBoundingClientRect();

      return {
        x: (containerSize.width - modalRect.width) / 2,
        y: (containerSize.height - modalRect.height) / 2
      };
    }
    return null;
  }, [modalContentRef, containerSize]);

  const updateModalPosition = useCallback(() => {
    const newModalPosition = calculateModalPosition();

    if (newModalPosition) {
      setModalState((prevState) => ({
        ...prevState,
        position: newModalPosition
      }));
    }
  }, [calculateModalPosition, containerSize]);

  useLayoutEffect(() => {
    const handleResize = () => {
      const currentAppWidth = window.innerWidth;
      const currentAppHeight = window.innerHeight;

      setContainerSize({
        width: currentAppWidth,
        height: currentAppHeight
      });
      updateModalPosition();
    };

    window.addEventListener("DOMContentLoaded", handleResize);
    window.addEventListener("resize", handleResize);
    document.body.appendChild(modalRootRef.current);

    return () => {
      window.removeEventListener("DOMContentLoaded", handleResize);
      window.removeEventListener("resize", handleResize);
      document.body.removeChild(modalRootRef.current);
    };
  }, [updateModalPosition]);

  useEffect(() => {
    console.log(
      "isOpen:",
      modalState.isOpen,
      "modalPosition:",
      modalState.position,
      "isDragging:",
      modalState.isDragging
    );
  }, [modalState.isOpen, modalState.position, modalState.isDragging]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() === "") {
      const errorText = "You cannot enter an empty note.";
      setModalState({
        isOpen: true,
        position: modalState.position,
        isDragging: false,
        isError: true,
        selectedNote: { input: errorText, id: crypto.randomUUID() }
      });
      setInput("");
    } else {
      setNotes((prevNotes) => [
        { input, id: crypto.randomUUID() },
        ...prevNotes
      ]);
      setInput("");
    }
  };

  const handleClick = (note) => {
    const isNoteExist = notes.some((n) => n.id === note.id);
    if (isNoteExist) {
      setModalState((prevState) => ({
        ...prevState,
        isOpen: true,
        position: modalState.position,
        isDragging: false,
        selectedNote: note
      }));
    }
  };

  const handleDeleteNote = (id) => {
    setModalState((prevState) => ({
      ...prevState,
      isOpen: prevState.selectedNote?.id === id ? false : prevState.isOpen,
      selectedNote: null
    }));

    const newNotes = notes.filter((note) => note.id !== id);
    setNotes(newNotes);
  };

  useEffect(() => {
    if (!modalState.selectedNote) {
      setModalState((prevState) => ({ ...prevState, isOpen: false }));
    }
  }, [modalState.selectedNote, setModalState]);

  // Modal Component

  const Modal = ({ text, delay, modalRef, modalContentRef }) => {
    const timeoutRef = useRef();

    const handleModalDrag = (e) => {
      e.preventDefault();

      // console.log("e:", e, "native:", e.nativeEvent);

      const { clientX, clientY } = e.nativeEvent;
      const { left, top } = modalRef.current.getBoundingClientRect();
      const offsetX = clientX - left;
      const offsetY = clientY - top;

      setModalState((prevState) => ({
        ...prevState,
        isDragging: true,
        position: {
          x: clientX - offsetX,
          y: clientY - offsetY,
          offsetX,
          offsetY
        }
      }));
    };

    const handleMouseMove = (e) => {
      if (!modalState.isDragging || !modalState.position) return;
      setModalState((prevState) => ({
        ...prevState,
        position: {
          x: e.clientX - prevState.position.offsetX,
          y: e.clientY - prevState.position.offsetY,
          offsetX: prevState.position.offsetX,
          offsetY: prevState.position.offsetY
        }
      }));
    };

    const handleMouseUp = () => {
      setModalState((prevState) => ({
        ...prevState,
        isDragging: false
      }));
    };

    useEffect(() => {
      if (modalState.isDragging) {
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
      } else {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      }

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }, [modalState.isDragging]);

    useEffect(() => {
      if (delay) {
        timeoutRef.current = setTimeout(() => {
          setModalState((prevState) => ({
            ...prevState,
            isOpen: false
          }));
        }, delay);

        return () => {
          clearTimeout(timeoutRef.current);
        };
      }
    }, [delay]);

    const handleModalContentClick = (e) => {
      e.stopPropagation();
    };

    const handleOutsideClick = (e) => {
      if (modalRef.current && modalState.isOpen) {
        const isInsideModal = modalRef.current.contains(e.target);
        if (!isInsideModal) {
          setModalState((prevState) => ({
            ...prevState,
            isOpen: false,
            isDragging: false
          }));
        }
      }
    };

    useEffect(() => {
      document.addEventListener("mouseup", handleOutsideClick);

      return () => {
        document.removeEventListener("mouseup", handleOutsideClick);
      };
    }, [modalRef, modalState.isOpen]);

    return (
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="modalContent"
        ref={modalRef}
        onMouseDown={handleModalDrag}
      >
        <p
          className="modalContent"
          ref={modalContentRef}
          onClick={handleModalContentClick}
        >
          {text}
        </p>
      </div>
    );
  };

  // end of modal component

  return (
    <div className="App" role="main">
      <h1 className="app-heading">Take Notes</h1>
      <div className="form">
        <form onSubmit={handleSubmit}>
          <label htmlFor="userInput">Enter Note: </label>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            name="userInput"
            id="userInput"
            type="text"
            // autoFocus
          />
          <button className="submitBtn" type="submit">
            Add Note
          </button>
          <button
            className="deleteBtn"
            type="button"
            onClick={() => {
              setModalState((prevState) => ({
                ...prevState,
                isOpen: false,
                isDragging: false
              }));
              setNotes([]);
            }}
          >
            Delete All
          </button>
        </form>
      </div>
      <div className="notes">
        <h2 className="notes-heading">Notes</h2>
        <section className="notes-list">
          {notes.map((note, index) => {
            return (
              <article
                onClick={() => handleClick(note)}
                key={note.id}
                role="button"
                tabIndex={0}
                className={`note note-${index}`}
              >
                <p className={`index index-${index + 1}`}>{index + 1}.</p>
                <p className={`text text-${index}`}>
                  {note.input.length <= 6
                    ? note.input
                    : `${note.input.slice(0, 5)}...`}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNote(note.id);
                  }}
                >
                  X
                </button>
              </article>
            );
          })}
        </section>
        {modalState.isOpen &&
          !modalState.isError &&
          createPortal(
            <div
              className="modalContainer"
              aria-hidden={!modalState.isOpen}
              style={{
                top: modalState.position?.y,
                left: modalState.position?.x,
                cursor: modalState.isDragging ? "grabbing" : "grab"
              }}
            >
              <Modal
                text={modalState.selectedNote?.input}
                modalRef={modalRef}
                modalContentRef={modalContentRef}
              />
            </div>,
            modalRootRef.current,
            crypto.randomUUID()
          )}
        {modalState.isOpen &&
          modalState.isError &&
          createPortal(
            <div
              className="modalContainer"
              aria-hidden={!modalState.isOpen}
              style={{
                top: modalState.position?.y,
                left: modalState.position?.x,
                cursor: modalState.isDragging ? "grabbing" : "grab"
              }}
            >
              <Modal
                text={modalState.selectedNote?.input}
                delay={errorDelay}
                modalRef={modalRef}
                modalContentRef={modalContentRef}
              />
            </div>,
            modalRootRef.current,
            crypto.randomUUID()
          )}
      </div>
    </div>
  );
}

export default App;
