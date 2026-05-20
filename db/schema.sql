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
    dminstt_nm           VARCHAR(200),
    bid_mtd_nm              VARCHAR(100),
    cntrct_cncls_mthd_nm    VARCHAR(100),
    is_isp_ismp             BOOLEAN         NOT NULL DEFAULT FALSE,
    isp_ismp_type           VARCHAR(10)     CHECK (isp_ismp_type IN ('ISP', 'ISMP')),
    asign_bdgt_amt          NUMERIC(18,2),
    presmpt_prce           NUMERIC(18,2),
    bid_clse_dt             TIMESTAMPTZ,
    bid_ntce_dt             TIMESTAMPTZ,
    ntce_end_dt             TIMESTAMPTZ,
    openg_dt                TIMESTAMPTZ,
    exec_term_start_dt      DATE,
    exec_term_end_dt        DATE,
    bid_ntce_dtl_url                TEXT,
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

CREATE TABLE attachments (
    id            SERIAL PRIMARY KEY,
    notice_id     INTEGER         NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
    file_name     VARCHAR(300)    NOT NULL,
    file_url      TEXT            NOT NULL,
    file_type     VARCHAR(20)     NOT NULL,
    local_path    TEXT,
    parse_status  VARCHAR(20)     NOT NULL DEFAULT 'pending'
                      CHECK (parse_status IN ('pending','done','failed')),
    downloaded_at TIMESTAMPTZ
);

CREATE INDEX idx_attachments_notice_id ON attachments (notice_id);

-- AI 분석 결과. AI 파트(강현묵)의 Gemini 출력 구조에 맞춰 설계.
-- 자주 필터/집계하는 필드는 정형 컬럼, 가변/리스트형은 JSONB.
-- 독소조항(poison_clauses)은 항상 공고 단위 전체로 다뤄지므로 별도 테이블 대신 JSONB.
CREATE TABLE analysis_results (
    id                  SERIAL PRIMARY KEY,
    notice_id           INTEGER         NOT NULL REFERENCES notices(id) ON DELETE CASCADE,

    -- 정형 (대시보드 필터/집계용)
    project_type        VARCHAR(20),
    estimated_price     BIGINT,
    allocated_budget    BIGINT,
    project_duration    VARCHAR(50),
    contract_method     VARCHAR(100),
    submit_deadline     TIMESTAMPTZ,
    risk_level          VARCHAR(10)     CHECK (risk_level IN ('safe','warning','danger')),

    -- 텍스트 / 반정형
    issuing_org         TEXT,
    project_summary     TEXT,
    project_scope       TEXT,
    qualification       TEXT,
    eval_criteria       JSONB,
    requirements        JSONB,
    tech_requirements   JSONB,
    poison_clauses      JSONB,

    -- 메타
    raw_analysis        JSONB,
    model_used          VARCHAR(50),
    prompt_version      VARCHAR(20),
    analysis_status     VARCHAR(20)     NOT NULL DEFAULT 'pending'
                            CHECK (analysis_status IN ('pending','processing','completed','failed')),
    analyzed_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (notice_id)
);

CREATE INDEX idx_analysis_notice_id ON analysis_results (notice_id);
CREATE INDEX idx_analysis_risk_level ON analysis_results (risk_level);

CREATE TABLE proposal_outlines (
    id                      SERIAL PRIMARY KEY,
    notice_id               INTEGER         NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
    outline_version         INTEGER         NOT NULL DEFAULT 1,
    guideline_base          VARCHAR(20)     NOT NULL DEFAULT 'MOIS_ISP',
    total_pages_estimate    INTEGER,
    sections                JSONB           NOT NULL DEFAULT '[]'::jsonb,
    model_used              VARCHAR(50),
    prompt_version          VARCHAR(20),
    generated_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_proposal_outlines_notice_id ON proposal_outlines (notice_id);
CREATE INDEX idx_proposal_outlines_is_active ON proposal_outlines (notice_id, is_active);

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
