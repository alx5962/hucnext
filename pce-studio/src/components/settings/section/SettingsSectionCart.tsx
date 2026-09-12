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
import settingsActions from "store/features/settings/settingsActions";
import { TargetSystem } from "store/features/settings/settingsState";
import { useAppDispatch, useAppSelector } from "store/hooks";

interface SettingsSectionCartProps {
  searchTerm: string;
}

interface TargetSystemOption {
  value: TargetSystem;
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

  const rawTargetSystem = useAppSelector(
    (state) => (state.project.present.settings as any).targetSystem,
  );
  const targetSystem: TargetSystem =
    rawTargetSystem === "cd" ? "iso" : (rawTargetSystem as TargetSystem) || "pce";

  const onChangeTargetSystem = useCallback(
    (targetSystem: TargetSystem) => {
      dispatch(settingsActions.editSettings({ targetSystem } as any));
    },
    [dispatch],
  );

  const onRestoreDefault = useCallback(() => {
    dispatch(
      settingsActions.editSettings({
        targetSystem: "pce",
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
