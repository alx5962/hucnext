import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { Select } from "ui/form/Select";
import l10n from "shared/lib/lang/l10n";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { FormRow, FormField } from "ui/form/layout/FormLayout";
import { ThemeContext } from "styled-components";
import { WaveEditorInput } from "./WaveEditorInput";
import clamp from "shared/lib/helpers/clamp";

interface WaveEditorFormProps {
  waveId: number;
  onChange: (newValue: number) => void;
}

const PADDING = 10;

export const WaveEditorForm = ({ waveId, onChange }: WaveEditorFormProps) => {
  const dispatch = useAppDispatch();
  const themeContext = useContext(ThemeContext);

  const songWave = useAppSelector(
    (state) => state.trackerDocument.present.song?.waves[waveId],
  );

  const wavesLength = useAppSelector(
    (state) => state.trackerDocument.present.song?.waves.length ?? 0,
  );

  const waveOptions = useMemo(
    () =>
      Array.from({ length: wavesLength }).map((_, index) => ({
        value: index,
        label: `${l10n("FIELD_WAVEFORM")} ${index}`,
      })),
    [wavesLength],
  );

  const selectedWave = useMemo(
    () => waveOptions?.find((wave) => wave.value === waveId),
    [waveId, waveOptions],
  );

  const onEditWave = useCallback(
    (newWave: Uint8Array) => {
      dispatch(
        trackerDocumentActions.editWaveform({
          index: waveId,
          waveForm: newWave,
        }),
      );
    },
    [dispatch, waveId],
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (wavesLength === 0 || !songWave) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const defaultColor = themeContext?.colors.tracker.wave ?? "#fff";
    const backgroundColor =
      themeContext?.colors.tracker.waveBackground ?? "#000";

    const getLayout = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      const width = rect.width;
      const height = rect.height;

      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const drawWidth = width - PADDING * 2;
      const drawHeight = height - PADDING * 2;
      const waveLength = songWave.length;
      const pointLength = drawWidth / (waveLength - 1);
      const pointHeight = drawHeight / 15;

      return {
        rect,
        width,
        height,
        drawWidth,
        drawHeight,
        pointLength,
        pointHeight,
      };
    };

    const clear = () => {
      const { width, height } = getLayout();
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    };

    const drawWave = (waves: Uint8Array, color?: string) => {
      const { drawHeight, pointLength, pointHeight } = getLayout();

      ctx.beginPath();
      ctx.strokeStyle = color ?? defaultColor;
      ctx.lineWidth = 2;

      waves.forEach((y, x) => {
        const px = PADDING + x * pointLength;
        const py = PADDING + drawHeight - y * pointHeight;

        if (x === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      });

      ctx.shadowColor = color ?? defaultColor;
      ctx.lineWidth = 1;
      ctx.strokeStyle = "black";

      for (let i = 0; i < 8; i++) {
        ctx.stroke();
        ctx.shadowBlur = i * 6;
      }

      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowBlur = 0;
      ctx.strokeStyle = color ?? defaultColor;
      ctx.stroke();
    };

    const redraw = (waves: Uint8Array, color?: string) => {
      clear();
      drawWave(waves, color);
    };

    redraw(songWave);

    let mousedown = false;
    let newWaves = new Uint8Array(songWave);

    const updateWaveAtPosition = (clientX: number, clientY: number) => {
      const { rect, pointLength, pointHeight } = getLayout();

      const pos = {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };

      const gridP = {
        i: clamp(
          Math.round((pos.x - PADDING) / pointLength),
          0,
          songWave.length - 1,
        ),
        j: clamp(Math.round((pos.y - PADDING) / pointHeight), 0, 15),
      };

      if (gridP.j < 16) {
        if (!mousedown) {
          newWaves = new Uint8Array(songWave);
        }

        newWaves[gridP.i] = clamp(15 - gridP.j, 0, 15);
        redraw(newWaves);
      }
    };

    const handleMouseOut = () => {
      if (!mousedown) {
        redraw(songWave);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!mousedown) {
        return;
      }

      updateWaveAtPosition(e.clientX, e.clientY);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.target === canvasRef.current) {
        mousedown = true;
        updateWaveAtPosition(e.clientX, e.clientY);
      }
    };

    const handleMouseUp = () => {
      if (mousedown) {
        mousedown = false;
        onEditWave(newWaves);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.target !== canvasRef.current) {
        return;
      }

      const touch = e.touches[0];
      if (!touch) {
        return;
      }

      mousedown = true;
      e.preventDefault();
      updateWaveAtPosition(touch.clientX, touch.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!mousedown) {
        return;
      }

      const touch = e.touches[0];
      if (!touch) {
        return;
      }

      e.preventDefault();
      updateWaveAtPosition(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = () => {
      if (mousedown) {
        mousedown = false;
        onEditWave(newWaves);
      }
    };

    const handleResize = () => {
      redraw(songWave);
    };

    canvas.addEventListener("mouseout", handleMouseOut);
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);
    window.addEventListener("resize", handleResize);

    return () => {
      canvas.removeEventListener("mouseout", handleMouseOut);
      canvas.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
      window.removeEventListener("resize", handleResize);
    };
  }, [
    onEditWave,
    songWave,
    themeContext?.colors.tracker.wave,
    themeContext?.colors.tracker.waveBackground,
    wavesLength,
  ]);

  const pcePresets: { name: string; wave: number[] }[] = [
    {
      name: "Piano",
      wave: [8, 10, 13, 14, 15, 15, 15, 14, 12, 9, 7, 5, 3, 2, 1, 1, 1, 1, 2, 3, 4, 5, 6, 7, 7, 8, 8, 8, 8, 8, 8, 8],
    },
    {
      name: "Harpsichord",
      wave: [8, 11, 13, 15, 15, 15, 13, 11, 8, 6, 4, 3, 2, 2, 1, 1, 2, 2, 3, 4, 5, 6, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8],
    },
    {
      name: "Flute",
      wave: [8, 10, 12, 14, 15, 15, 15, 15, 15, 15, 15, 14, 12, 10, 8, 5, 3, 2, 1, 0, 0, 0, 0, 0, 1, 2, 3, 5, 6, 7, 7, 8],
    },
    {
      name: "String",
      wave: [8, 9, 11, 13, 14, 15, 15, 15, 15, 15, 15, 14, 13, 11, 9, 8, 6, 5, 3, 2, 1, 1, 0, 0, 1, 1, 2, 4, 5, 6, 7, 8],
    },
    {
      name: "Sine",
      wave: [8, 9, 11, 12, 13, 14, 15, 15, 15, 15, 14, 13, 12, 11, 9, 8, 7, 6, 4, 3, 2, 1, 0, 0, 0, 0, 1, 2, 3, 4, 6, 7],
    },
    {
      name: "Triangle",
      wave: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
    },
    {
      name: "Saw",
      wave: [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
    },
  ];

  return (
    <>
      <FormRow>
        <FormField name="waveIndex" label={l10n("FIELD_WAVEFORM")}>
          <Select
            name="waveIndex"
            value={selectedWave}
            options={waveOptions}
            onChange={(e) => e && onChange(e.value)}
          />
        </FormField>
      </FormRow>
      <FormRow>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
          {pcePresets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "3px",
                border: "1px solid #444",
                background: "#222",
                color: "#ddd",
                cursor: "pointer",
              }}
              onClick={() => onEditWave(new Uint8Array(preset.wave))}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </FormRow>
      <FormRow>
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: 100,
            backgroundColor: "#000",
            borderRadius: 4,
            cursor: "pointer",
            display: "block",
            touchAction: "none",
          }}
        />
      </FormRow>
      <FormRow>
        <WaveEditorInput waveId={waveId} onEditWave={onEditWave} />
      </FormRow>
    </>
  );
};
