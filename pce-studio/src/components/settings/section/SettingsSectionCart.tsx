import React, { useCallback } from "react";
import { SingleValue } from "react-select";
import l10n from "shared/lib/lang/l10n";
import { Alert } from "ui/alerts/Alert";
import { Button } from "ui/buttons/Button";
import { CardAnchor, CardButtons, CardHeading } from "ui/cards/Card";
import { SearchableCard } from "ui/cards/SearchableCard";
import { SearchableSettingRow } from "ui/form/SearchableSettingRow";
import { SettingRowInput, SettingRowLabel } from "ui/form/SettingRow";
import { Select } from "ui/form/Select";
import { CheckboxField } from "ui/form/CheckboxField";
import settingsActions from "store/features/settings/settingsActions";
import {
  CDAudioFormat,
  TargetSystem,
} from "store/features/settings/settingsState";
import { useAppDispatch, useAppSelector } from "store/hooks";

interface SettingsSectionCartProps {
  searchTerm: string;
}

interface TargetSystemOption {
  value: TargetSystem;
  label: string;
}

interface CDAudioFormatOption {
  value: CDAudioFormat;
  label: string;
}

export const SettingsSectionCart = ({
  searchTerm,
}: SettingsSectionCartProps) => {
  const dispatch = useAppDispatch();

  const targetOptions: TargetSystemOption[] = [
    {
      value: "pce",
      label: l10n("FIELD_TARGET_PCE"),
    },
    {
      value: "sgx",
      label: l10n("FIELD_TARGET_SGX"),
    },
    {
      value: "iso",
      label: l10n("FIELD_TARGET_SCD"),
    },
  ];

  const cdAudioFormatOptions: CDAudioFormatOption[] = [
    {
      value: "wav",
      label: l10n("FIELD_CD_AUDIO_FORMAT_WAV"),
    },
    {
      value: "bin",
      label: l10n("FIELD_CD_AUDIO_FORMAT_BIN"),
    },
  ];

  const rawTargetSystem = useAppSelector(
    (state) => (state.project.present.settings as any).targetSystem,
  );
  const targetSystem: TargetSystem =
    rawTargetSystem === "cd" ? "iso" : (rawTargetSystem as TargetSystem) || "pce";

  const cdAudioFormat: CDAudioFormat = useAppSelector(
    (state) => (state.project.present.settings as any).cdAudioFormat || "wav",
  );

  const sf2Enabled = useAppSelector(
    (state) => Boolean((state.project.present.settings as any).sf2Enabled),
  );

  const onChangeTargetSystem = useCallback(
    (targetSystem: TargetSystem) => {
      dispatch(settingsActions.editSettings({ targetSystem } as any));
    },
    [dispatch],
  );

  const onChangeCDAudioFormat = useCallback(
    (cdAudioFormat: CDAudioFormat) => {
      dispatch(settingsActions.editSettings({ cdAudioFormat } as any));
    },
    [dispatch],
  );

  const onChangeSF2Enabled = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        settingsActions.editSettings({
          sf2Enabled: e.currentTarget.checked,
        } as any),
      );
    },
    [dispatch],
  );

  const onRestoreDefault = useCallback(() => {
    dispatch(
      settingsActions.editSettings({
        targetSystem: "pce",
        sf2Enabled: false,
        cdAudioFormat: "wav",
      } as any),
    );
  }, [dispatch]);

  const currentValue =
    targetOptions.find((option) => option.value === targetSystem) ||
    targetOptions[0];

  const getTargetDescription = () => {
    switch (targetSystem) {
      case "sgx":
        return l10n("FIELD_TARGET_INFO_SGX");
      case "iso":
      case "cd":
        return l10n("FIELD_TARGET_INFO_SCD");
      case "pce":
      default:
        return l10n("FIELD_TARGET_INFO_PCE");
    }
  };

  const isCDTarget = targetSystem === "iso" || targetSystem === "cd";

  return (
    <SearchableCard
      searchTerm={searchTerm}
      searchMatches={[
        l10n("SETTINGS_TARGET_SYSTEM"),
        l10n("FIELD_TARGET_SYSTEM"),
        "HuCard",
        "SuperGrafx",
        "ISO",
        "CD-ROM",
        "PCE",
        "SGX",
        "SF2",
        "Street Fighter",
        "Mapper",
        "WAV",
        "BIN",
      ]}
    >
      <CardAnchor id="settingsTargetSystem" />
      <CardAnchor id="settingsCartType" />
      <CardHeading>{l10n("SETTINGS_TARGET_SYSTEM")}</CardHeading>

      <SearchableSettingRow
        searchTerm={searchTerm}
        searchMatches={[
          l10n("SETTINGS_TARGET_SYSTEM"),
          l10n("FIELD_TARGET_SYSTEM"),
        ]}
      >
        <SettingRowLabel>{l10n("FIELD_TARGET_SYSTEM")}</SettingRowLabel>
        <SettingRowInput>
          <Select
            value={currentValue}
            options={targetOptions}
            onChange={(newValue: SingleValue<TargetSystemOption>) => {
              if (newValue) {
                onChangeTargetSystem(newValue.value);
              }
            }}
          />
          <div style={{ marginTop: 8 }}>
            <Alert variant="info">
              <p>{getTargetDescription()}</p>
            </Alert>
          </div>
        </SettingRowInput>
      </SearchableSettingRow>

      {isCDTarget && (
        <SearchableSettingRow
          searchTerm={searchTerm}
          searchMatches={[
            l10n("FIELD_CD_AUDIO_FORMAT"),
            "WAV",
            "BIN",
            "CD-DA",
            "Audio",
            "Track",
          ]}
        >
          <SettingRowLabel>{l10n("FIELD_CD_AUDIO_FORMAT")}</SettingRowLabel>
          <SettingRowInput>
            <Select
              value={
                cdAudioFormatOptions.find(
                  (option) => option.value === cdAudioFormat,
                ) || cdAudioFormatOptions[0]
              }
              options={cdAudioFormatOptions}
              onChange={(newValue: SingleValue<CDAudioFormatOption>) => {
                if (newValue) {
                  onChangeCDAudioFormat(newValue.value);
                }
              }}
            />
            <div style={{ marginTop: 8 }}>
              <Alert variant="info">
                <p>
                  {cdAudioFormat === "bin"
                    ? l10n("FIELD_CD_AUDIO_FORMAT_INFO_BIN")
                    : l10n("FIELD_CD_AUDIO_FORMAT_INFO_WAV")}
                </p>
              </Alert>
            </div>
          </SettingRowInput>
        </SearchableSettingRow>
      )}

      <SearchableSettingRow
        searchTerm={searchTerm}
        searchMatches={[
          "SF2",
          "Street Fighter",
          "Mapper",
          l10n("FIELD_ENABLE_SF2"),
        ]}
      >
        <SettingRowLabel>{l10n("FIELD_ENABLE_SF2")}</SettingRowLabel>
        <SettingRowInput>
          {isCDTarget ? (
            <Alert variant="warning">
              <p>{l10n("FIELD_SF2_UNAVAILABLE_CD")}</p>
            </Alert>
          ) : (
            <>
              <CheckboxField
                name="sf2Enabled"
                label={l10n("FIELD_ENABLE_SF2")}
                checked={sf2Enabled}
                onChange={onChangeSF2Enabled}
              />
              <div style={{ marginTop: 8 }}>
                <Alert variant="info">
                  <p>{l10n("FIELD_ENABLE_SF2_DESC")}</p>
                </Alert>
              </div>
            </>
          )}
        </SettingRowInput>
      </SearchableSettingRow>

      {!searchTerm && (
        <CardButtons>
          <Button onClick={onRestoreDefault}>
            {l10n("FIELD_RESTORE_DEFAULT")}
          </Button>
        </CardButtons>
      )}
    </SearchableCard>
  );
};
