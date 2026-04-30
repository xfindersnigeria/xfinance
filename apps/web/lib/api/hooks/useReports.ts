import { useQuery } from "@tanstack/react-query";
import * as reportService from "../services/reportService";
import { ProfitAndLossData, ProfitAndLossParams } from "../services/reportService";

export const useProfitAndLoss = (params: ProfitAndLossParams) =>
  useQuery<ProfitAndLossData>({
    queryKey: [
      "profit-and-loss",
      params.startDate,
      params.endDate,
      params.compareStartDate,
      params.compareEndDate,
    ],
    queryFn: () => reportService.getProfitAndLoss(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
  });
