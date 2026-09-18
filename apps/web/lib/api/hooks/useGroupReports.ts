import { useQuery } from "@tanstack/react-query";
import * as groupReportService from "../services/groupReportService";
import type {
  EntityComparisonData,
  GroupBalanceSheetData,
  GroupBalanceSheetParams,
  GroupCashFlowData,
  GroupCashFlowForecastData,
  GroupPeriodParams,
  GroupProfitAndLossData,
  GroupReportMeta,
} from "../services/groupReportService";

type Envelope<T> = { data: T };

const common = { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false };

export const useGroupReportContext = () =>
  useQuery<Envelope<GroupReportMeta>>({
    queryKey: ["group-report-context"],
    queryFn: () => groupReportService.getGroupReportContext() as Promise<Envelope<GroupReportMeta>>,
    ...common,
  });

export const useGroupProfitAndLoss = (params: GroupPeriodParams) =>
  useQuery<Envelope<GroupProfitAndLossData>>({
    queryKey: ["group-profit-and-loss", params],
    queryFn: () => groupReportService.getGroupProfitAndLoss(params) as Promise<Envelope<GroupProfitAndLossData>>,
    enabled: !!params.startDate && !!params.endDate,
    ...common,
  });

export const useGroupBalanceSheet = (params: GroupBalanceSheetParams) =>
  useQuery<Envelope<GroupBalanceSheetData>>({
    queryKey: ["group-balance-sheet", params],
    queryFn: () => groupReportService.getGroupBalanceSheet(params) as Promise<Envelope<GroupBalanceSheetData>>,
    enabled: !!params.asOfDate,
    ...common,
  });

export const useGroupCashFlow = (params: GroupPeriodParams) =>
  useQuery<Envelope<GroupCashFlowData>>({
    queryKey: ["group-cash-flow", params],
    queryFn: () => groupReportService.getGroupCashFlow(params) as Promise<Envelope<GroupCashFlowData>>,
    enabled: !!params.startDate && !!params.endDate,
    ...common,
  });

export const useEntityComparison = (params: GroupPeriodParams) =>
  useQuery<Envelope<EntityComparisonData>>({
    queryKey: ["group-entity-comparison", params],
    queryFn: () => groupReportService.getEntityComparison(params) as Promise<Envelope<EntityComparisonData>>,
    enabled: !!params.startDate && !!params.endDate,
    ...common,
  });

export const useGroupCashFlowForecast = (months: number) =>
  useQuery<Envelope<GroupCashFlowForecastData>>({
    queryKey: ["group-cash-flow-forecast", months],
    queryFn: () => groupReportService.getGroupCashFlowForecast({ months }) as Promise<Envelope<GroupCashFlowForecastData>>,
    ...common,
  });
