-- ============================================================
-- koneps DB 스키마 v2.0
-- 팀: 최강제곱 | 담당: 강주현
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE notices (
    id                      SERIAL PRIMARY KEY,
    bid_ntce_no             VARCHAR(40)     NOT NULL,
    bid_ntce_ord            VARCHAR(10)     NOT NULL DEFAULT '00',
    notice_type             VARCHAR(10)     NOT NULL CHECK (notice_type IN ('new', 'revised', 'cancelled')),
    bid_ntce_nm             VARCHAR(500)    NOT NULL,
    ntce_instt_nm           VARCHAR(200),
    dmnd_instt_nm           VARCHAR(200),
    bid_mtd_nm              VARCHAR(100),
    cntrct_cnclsn_mtd_nm    VARCHAR(100),
    is_isp_ismp             BOOLEAN         NOT NULL DEFAULT FALSE,
    isp_ismp_type           VARCHAR(10)     CHECK (isp_ismp_type IN ('ISP', 'ISMP')),
    asign_bdgt_amt          NUMERIC(18,2),
    pre_asign_amt           NUMERIC(18,2),
    bid_clse_dt             TIMESTAMPTZ,
    ntce_bgn_dt             TIMESTAMPTZ,
    ntce_end_dt             TIMESTAMPTZ,
    openg_dt                TIMESTAMPTZ,
    exec_term_start_dt      DATE,
    exec_term_end_dt        DATE,
    ntce_url                TEXT,
    attach_file_url         TEXT,
    raw_file_path           TEXT,
    raw_file_ext            VARCHAR(10),
    pipeline_status         VARCHAR(20)     NOT NULL DEFAULT 'collected'
                                CHECK (pipeline_status IN ('collected','downloaded','parsed','analyzed','completed','failed')),
    parse_error_msg         TEXT,
    content_embedding       vector(1536),
    collected_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (bid_ntce_no, bid_ntce_ord)
);

CREATE INDEX idx_notices_bid_clse_dt     ON notices (bid_clse_dt DESC);
CREATE INDEX idx_notices_is_isp_ismp     ON notices (is_isp_ismp);
CREATE INDEX idx_notices_pipeline_status ON notices (pipeline_status);
CREATE INDEX idx_notices_ntce_instt_nm   ON notices (ntce_instt_nm);
CREATE INDEX idx_notices_bid_ntce_no     ON notices (bid_ntce_no);
CREATE INDEX idx_notices_collected_at    ON notices (collected_at DESC);

CREATE TABLE analysis_results (
    id                      SERIAL PRIMARY KEY,
    notice_id               INTEGER         NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
    budget_amt              NUMERIC(18,2),
    budget_raw              TEXT,
    bid_qualify             TEXT,
    exec_period_months      INTEGER,
    exec_period_raw         TEXT,
    manmonth_total          NUMERIC(8,2),
    manmonth_detail         JSONB,
    past_performance        TEXT,
    eval_tech_score         NUMERIC(5,2),
    eval_price_score        NUMERIC(5,2),
    task_scope              TEXT,
    joint_supply_yn         BOOLEAN,
    joint_supply_detail     TEXT,
    submit_deadline         TIMESTAMPTZ,
    required_docs           JSONB,
    exec_location           TEXT,
    key_tech_spec           TEXT,
    disqualify_reason       TEXT,
    contact_person          JSONB,
    confidence_score        NUMERIC(4,3),
    model_used              VARCHAR(50),
    prompt_version          VARCHAR(20),
    analyzed_at             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (notice_id)
);

CREATE INDEX idx_analysis_notice_id ON analysis_results (notice_id);

CREATE TABLE risk_factors (
    id                      SERIAL PRIMARY KEY,
    notice_id               INTEGER         NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
    risk_category           VARCHAR(50)     NOT NULL,
    risk_level              VARCHAR(10)     NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('high','medium','low')),
    clause_title            VARCHAR(200),
    clause_original         TEXT,
    clause_summary          TEXT            NOT NULL,
    page_no                 INTEGER,
    mitigation_suggest      TEXT,
    sort_order              INTEGER         NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_factors_notice_id  ON risk_factors (notice_id);
CREATE INDEX idx_risk_factors_risk_level ON risk_factors (risk_level);

CREATE TABLE proposal_outlines (
    id                      SERIAL PRIMARY KEY,
    notice_id               INTEGER         NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
    outline_version         INTEGER         NOT NULL DEFAULT 1,
    guideline_base          VARCHAR(20)     NOT NULL DEFAULT 'MOIS_ISP',
    total_pages_estimate    INTEGER,
    model_used              VARCHAR(50),
    prompt_version          VARCHAR(20),
    generated_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_proposal_outlines_notice_id ON proposal_outlines (notice_id);
CREATE INDEX idx_proposal_outlines_is_active ON proposal_outlines (notice_id, is_active);

CREATE TABLE proposal_sections (
    id                      SERIAL PRIMARY KEY,
    outline_id              INTEGER         NOT NULL REFERENCES proposal_outlines(id) ON DELETE CASCADE,
    level                   SMALLINT        NOT NULL CHECK (level BETWEEN 1 AND 4),
    parent_id               INTEGER         REFERENCES proposal_sections(id) ON DELETE CASCADE,
    sort_order              INTEGER         NOT NULL DEFAULT 0,
    section_no              VARCHAR(20),
    section_title           VARCHAR(300)    NOT NULL,
    section_desc            TEXT,
    pages_estimate          INTEGER,
    is_mandatory            BOOLEAN         NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_proposal_sections_outline_id ON proposal_sections (outline_id);
CREATE INDEX idx_proposal_sections_parent_id  ON proposal_sections (parent_id);
CREATE INDEX idx_proposal_sections_level      ON proposal_sections (outline_id, level, sort_order);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notices_updated_at
    BEFORE UPDATE ON notices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_analysis_results_updated_at
    BEFORE UPDATE ON analysis_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DO $$
BEGIN
    RAISE NOTICE 'koneps schema v2.0 생성 완료';
END $$;
